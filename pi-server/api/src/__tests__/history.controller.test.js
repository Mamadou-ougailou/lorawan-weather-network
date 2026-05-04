import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

const { getHistory, getCompare } = await import("../../src/components/history/history.controller.js");

describe("History Controller", () => {
    let req, res;

    beforeEach(() => {
        mockQuery.mockReset();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getHistory", () => {
        it("should return history data for a specific site", async () => {
            req.query = { site: "2", hours: "48" };
            mockQuery.mockResolvedValue([[{ hour_start: "2026-05-04 12:00:00", site_id: 2, temperature_avg: 21.0 }]]);

            await getHistory(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual([48, 2]); // [hours, siteId]
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ hourStart: "2026-05-04 12:00:00", siteId: 2, temperatureAvg: 21.0 })
            ]);
        });
    });

    describe("getCompare", () => {
        it("should return comparison data across sites", async () => {
            req.query = { hours: "24" };
            mockQuery.mockResolvedValue([[{ hour: "2026-05-04T12:00:00", site_id: 1, temperature_avg: 22.0 }]]);

            await getCompare(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual([24]);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ hour: "2026-05-04T12:00:00", siteId: 1, temperatureAvg: 22.0 })
            ]);
        });
    });
});
