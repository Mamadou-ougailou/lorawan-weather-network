import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../../src/db.js", () => ({
    default: { query: mockQuery }
}));

const mockLoadMappings = jest.fn();
jest.unstable_mockModule("../../src/components/mappings/mappings.service.js", () => ({
    loadMappings: mockLoadMappings,
    getCachedMappings: jest.fn().mockReturnValue([
        { raw: "temp1", alias: "temperature" },
        { raw: "humid", alias: "humidity" }
    ])
}));

const { toMeasurementDTO, buildAggregateSQL, buildTrendSQL } = await import("../../src/dto.js");

describe("DTO Mappers (Dynamic)", () => {
    describe("toMeasurementDTO", () => {
        it("should extract readings JSON and flatten it into the object using dynamic mappings", () => {
            const row = {
                id: 10,
                site_id: 1,
                readings: { temp1: 22.5, humid: 60 }
            };

            const result = toMeasurementDTO(row);

            expect(result).toEqual({
                id: 10,
                siteId: 1,
                temperature: 22.5,
                humidity: 60
            });
            expect(result.readings).toBeUndefined();
        });
    });

    describe("SQL Builders", () => {
        it("should build aggregate SQL using dynamic mappings", () => {
            const sql = buildAggregateSQL("m");
            
            expect(sql).toContain("JSON_EXTRACT(m.readings, '$.temp1')");
            expect(sql).toContain("AS temperature_avg");
            expect(sql).toContain("AS humidity_avg");
            // Should not contain pressure since it's not in the mock
            expect(sql).not.toContain("pressure_avg");
        });

        it("should build trend SQL using dynamic mappings", () => {
            const sql = buildTrendSQL("m");
            
            expect(sql).toContain("JSON_EXTRACT(m.readings, '$.temp1')");
            expect(sql).toContain("AS temperature_avg");
        });
    });
});
