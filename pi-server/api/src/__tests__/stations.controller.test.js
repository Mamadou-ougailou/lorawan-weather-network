import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

// Dynamically import controller after mocking the DB
const { createStation, updateStation, deleteStation, getAllStations } = await import("../../src/components/stations/stations.controller.js");
const { AppError } = await import("../../src/utils/AppError.js");

describe("Stations Controller", () => {
    let req, res;

    beforeEach(() => {
        mockQuery.mockReset();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getAllStations", () => {
        it("should successfully return all stations", async () => {
            mockQuery.mockResolvedValue([[{ id: 1, name: "Station 1", is_active: 1 }]]);

            await getAllStations(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith([
                { id: 1, name: "Station 1", isActive: 1 }
            ]);
        });
    });

    describe("createStation", () => {
        it("should create a station successfully", async () => {
            req.body = { name: "Test", city: "Paris", latitude: 48, longitude: 2 };
            mockQuery.mockResolvedValue([{ insertId: 5 }]); // DB insert success returning auto-increment ID

            await createStation(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, id: 5 });
        });

        it("should throw AppError 400 if required fields are missing", async () => {
            req.body = { city: "Paris" }; // missing name

            await expect(createStation(req, res)).rejects.toThrow(AppError);
            await expect(createStation(req, res)).rejects.toMatchObject({ statusCode: 400 });
        });

        it("should throw AppError 409 if duplicate ID occurs", async () => {
            req.body = { name: "Test", city: "Paris", latitude: 48, longitude: 2 };
            
            const dupError = new Error("Duplicate");
            dupError.code = 'ER_DUP_ENTRY';
            mockQuery.mockRejectedValue(dupError);

            await expect(createStation(req, res)).rejects.toThrow(AppError);
            await expect(createStation(req, res)).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe("updateStation", () => {
        it("should successfully update a station", async () => {
            req.params.id = 1;
            req.body = { name: "New Name", isActive: true }; // Partial update
            mockQuery
                .mockResolvedValueOnce([[{ id: 1, name: "Old Name", city: "Old City", latitude: 0, longitude: 0, altitude_m: 0, is_active: 1, description: "Old" }]]) // SELECT check passes
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE query

            await updateStation(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if station not found", async () => {
            req.params.id = 999;
            req.body = { name: "New Name" };
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty array (not found)

            await expect(updateStation(req, res)).rejects.toThrow(AppError);
            await expect(updateStation(req, res)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe("deleteStation", () => {
        it("should successfully soft delete a station", async () => {
            req.params.id = 1;
            mockQuery
                .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT check passes
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE query

            await deleteStation(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if station not found to delete", async () => {
            req.params.id = 999;
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty array

            await expect(deleteStation(req, res)).rejects.toThrow(AppError);
            await expect(deleteStation(req, res)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
