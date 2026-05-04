import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

jest.unstable_mockModule("../../src/components/mappings/mappings.service.js", () => ({
    loadMappings: jest.fn(),
    getCachedMappings: jest.fn().mockReturnValue([
        { raw: "temp1", alias: "temperature" },
        { raw: "humid", alias: "humidity" }
    ])
}));

const { getLatestMeasurements, getMeasurements, getTrend, deleteMeasurement } = await import("../../src/components/measurements/measurements.controller.js");
const { AppError } = await import("../../src/utils/AppError.js");

describe("Measurements Controller", () => {
    let req, res;

    beforeEach(() => {
        mockQuery.mockReset();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getLatestMeasurements", () => {
        it("should return the latest measurements successfully", async () => {
            mockQuery.mockResolvedValue([[{ id: 10, site_id: 1, readings: '{"temp1": 25}' }]]);

            await getLatestMeasurements(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 10, siteId: 1, temperature: 25 })
            ]);
        });
    });

    describe("getMeasurements", () => {
        it("should return a list of measurements filtered by site", async () => {
            req.query = { site: "1", limit: "10" };
            mockQuery.mockResolvedValue([[{ id: 10, site_id: 1, readings: '{}' }]]);

            await getMeasurements(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual([1, 10]); // params: [siteId, limit]
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 10, siteId: 1 })
            ]);
        });
    });

    describe("getTrend", () => {
        it("should aggregate and return trend data", async () => {
            req.query = { hours: "24", interval: "60" };
            mockQuery.mockResolvedValue([[{ bucket: "2026-05-04", site_id: 1, temperature_avg: 22.5 }]]);

            await getTrend(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual([60, 60, 24]);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ bucket: "2026-05-04", siteId: 1, temperatureAvg: 22.5 })
            ]);
        });
    });

    describe("deleteMeasurement", () => {
        it("should delete a measurement successfully", async () => {
            req.params.id = 15;
            mockQuery
                .mockResolvedValueOnce([[{ id: 15 }]]) // SELECT check passes
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE query

            await deleteMeasurement(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it("should throw AppError 404 if measurement to delete is not found", async () => {
            req.params.id = 999;
            mockQuery.mockResolvedValue([[]]); // SELECT check returns empty array

            await expect(deleteMeasurement(req, res)).rejects.toThrow(AppError);
            await expect(deleteMeasurement(req, res)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
