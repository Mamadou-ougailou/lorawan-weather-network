import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Mock the database
const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

// Mock config
jest.unstable_mockModule("../../src/config.js", () => ({
    default: {
        jwt: { secret: "test-secret", expiresIn: "1h" }
    }
}));

// Dynamically import what we're testing
const authService = await import("../../src/components/auth/auth.service.js");
const authMiddleware = await import("../../src/components/auth/auth.middleware.js");
const { AppError } = await import("../../src/utils/AppError.js");

describe("Auth Module", () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe("auth.service.js", () => {
        describe("login", () => {
            it("should return a JWT token for valid credentials", async () => {
                const hash = await bcrypt.hash("password123", 1);
                mockQuery.mockResolvedValue([[{ id: 1, email: "test@local.com", password_hash: hash, role: "admin" }]]);

                const result = await authService.login({ email: "test@local.com", password: "password123" });
                
                expect(result).toHaveProperty("token");
                expect(result.user).toEqual({ id: 1, email: "test@local.com", role: "admin" });
                
                const decoded = jwt.verify(result.token, "test-secret");
                expect(decoded.email).toBe("test@local.com");
            });

            it("should throw 401 on invalid password", async () => {
                const hash = await bcrypt.hash("password123", 1);
                mockQuery.mockResolvedValue([[{ id: 1, email: "test@local.com", password_hash: hash, role: "admin" }]]);

                await expect(authService.login({ email: "test@local.com", password: "wrongpassword" }))
                    .rejects.toMatchObject({ statusCode: 401 });
            });
        });
    });

    describe("auth.middleware.js", () => {
        let req, res, next;

        beforeEach(() => {
            req = { headers: {} };
            res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            next = jest.fn();
        });

        describe("requireAuth", () => {
            it("should inject req.user and call next() if token is valid", () => {
                const token = jwt.sign({ id: 1, email: "test@local.com" }, "test-secret");
                req.headers.authorization = `Bearer ${token}`;

                authMiddleware.requireAuth(req, res, next);

                expect(next).toHaveBeenCalledTimes(1);
                expect(req.user).toBeDefined();
                expect(req.user.id).toBe(1);
                expect(req.user.email).toBe("test@local.com");
            });

            it("should throw 401 AppError if token is missing", () => {
                expect(() => authMiddleware.requireAuth(req, res, next)).toThrow(AppError);
                expect(next).not.toHaveBeenCalled();
            });

            it("should throw 401 AppError if token is invalid", () => {
                req.headers.authorization = "Bearer invalid-token-xyz";
                expect(() => authMiddleware.requireAuth(req, res, next)).toThrow(AppError);
                expect(next).not.toHaveBeenCalled();
            });
        });

        describe("requireRole", () => {
            it("should call next() if user has the required role", () => {
                req.user = { role: "admin" };
                const middleware = authMiddleware.requireRole("admin");
                middleware(req, res, next);
                
                expect(next).toHaveBeenCalledTimes(1);
            });

            it("should throw 403 AppError if user role is insufficient", () => {
                req.user = { role: "viewer" };
                const middleware = authMiddleware.requireRole("admin");
                
                expect(() => middleware(req, res, next)).toThrow(AppError);
                expect(next).not.toHaveBeenCalled();
            });
        });
    });
});
