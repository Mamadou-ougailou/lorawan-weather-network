import * as measurementsService from "./measurements.service.js";

export const getLatestMeasurements = async (_req, res) => {
    const measurements = await measurementsService.getLatestMeasurements();
    res.json(measurements);
};

export const getMeasurements = async (req, res) => {
    const siteId = parseInt(req.query.site, 10) || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);

    const measurements = await measurementsService.getMeasurements(siteId, limit);
    res.json(measurements);
};

export const getTrend = async (req, res) => {
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 168);
    const interval = Math.min(parseInt(req.query.interval, 10) || 30, 360);

    const trend = await measurementsService.getTrend(hours, interval);
    res.json(trend);
};

export const deleteMeasurement = async (req, res) => {
    await measurementsService.deleteMeasurement(req.params.id);
    res.json({ success: true });
};
