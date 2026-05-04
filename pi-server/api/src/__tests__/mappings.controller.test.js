import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

const { getAllMappings, createMapping, updateMapping, deleteMapping } = await import("../../src/components/mappings/mappings.controller.js");
const { AppError } = await import("../../src/utils/AppError.js");

describe("Mappings Controller", () => {
    let req, res;

    beforeEach(() => {
        mockQuery.mockReset();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getAllMappings", () => {
        it("should successfully return all mappings", async () => {
            mockQuery.mockResolvedValue([[{ id: 1, raw_key: "temp1", alias: "temperature", is_active: 1 }]]);

            await getAllMappings(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith([
                { id: 1, rawKey: "temp1", alias: "temperature", isActive: 1 }
            ]);
        });
    });

    describe("createMapping", () => {
        it("should create a mapping successfully and refresh cache", async () => {
            req.body = { rawKey: "pressure", alias: "atmPressure" };
            mockQuery
                .mockResolvedValueOnce([{ insertId: 5 }]) // Insert query
                .mockResolvedValueOnce([[]]); // Cache reload query

            await createMapping(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, id: 5 });
            expect(mockQuery).toHaveBeenCalledTimes(2); // INSERT + SELECT (reload)
        });
    });

    describe("updateMapping", () => {
        it("should successfully update a mapping", async () => {
            req.params.id = 1;
            req.body = { alias: "new_temperature" }; // Partial update
            mockQuery
                .mockResolvedValueOnce([[{ id: 1, raw_key: "temp", alias: "temperature", is_active: 1 }]]) // SELECT check
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
                .mockResolvedValueOnce([[]]); // Cache reload

            await updateMapping(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if mapping not found", async () => {
            req.params.id = 999;
            req.body = { rawKey: "test", alias: "test" };
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty

            await expect(updateMapping(req, res)).rejects.toThrow(AppError);
        });
    });

    describe("deleteMapping", () => {
        it("should successfully soft delete a mapping", async () => {
            req.params.id = 1;
            mockQuery
                .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT check
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE
                .mockResolvedValueOnce([[]]); // Cache reload

            await deleteMapping(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });
});
