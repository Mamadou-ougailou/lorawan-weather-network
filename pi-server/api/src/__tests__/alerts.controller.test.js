import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

const { getAllAlerts, resolveAlert, deleteAlert } = await import("../../src/components/alerts/alerts.controller.js");
const { AppError } = await import("../../src/utils/AppError.js");

describe("Alerts Controller", () => {
    let req, res;

    beforeEach(() => {
        mockQuery.mockReset();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getAllAlerts", () => {
        it("should return all alerts successfully", async () => {
            const mockAlert = { id: 1, siteId: 2, metric: "temperature", value: 45.0, threshold: 40.0 };
            mockQuery.mockResolvedValue([[mockAlert]]);

            await getAllAlerts(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith([mockAlert]);
        });
    });

    describe("resolveAlert", () => {
        it("should successfully resolve an alert", async () => {
            req.params.id = 5;
            mockQuery
                .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT check passes
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE query

            await resolveAlert(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if alert to resolve is not found", async () => {
            req.params.id = 999;
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty array

            await expect(resolveAlert(req, res)).rejects.toThrow(AppError);
            await expect(resolveAlert(req, res)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe("deleteAlert", () => {
        it("should successfully delete an alert", async () => {
            req.params.id = 5;
            mockQuery
                .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT check passes
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE query

            await deleteAlert(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if alert to delete is not found", async () => {
            req.params.id = 999;
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty array

            await expect(deleteAlert(req, res)).rejects.toThrow(AppError);
            await expect(deleteAlert(req, res)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
