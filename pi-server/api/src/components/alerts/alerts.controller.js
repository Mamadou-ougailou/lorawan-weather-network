import * as alertsService from "./alerts.service.js";

export const getAllAlerts = async (_req, res) => {
    const alerts = await alertsService.getAllAlerts();
    res.json(alerts);
};

export const resolveAlert = async (req, res) => {
    await alertsService.resolveAlert(req.params.id);
    res.json({ success: true });
};

export const deleteAlert = async (req, res) => {
    await alertsService.deleteAlert(req.params.id);
    res.json({ success: true });
};
