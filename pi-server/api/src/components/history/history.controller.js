import * as historyService from "./history.service.js";

export const getHistory = async (req, res) => {
    const siteId = parseInt(req.query.site, 10) || null;
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 720);

    const history = await historyService.getHistory(siteId, hours);
    res.json(history);
};

export const getCompare = async (req, res) => {
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 720);

    const compare = await historyService.getCompare(hours);
    res.json(compare);
};
