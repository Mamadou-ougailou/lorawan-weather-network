import * as stationsService from "./stations.service.js";

export const getAllStations = async (_req, res) => {
    const stations = await stationsService.getAllStations();
    res.json(stations);
};

export const createStation = async (req, res) => {
    const id = await stationsService.createStation(req.body);
    req.io.emit("stations_updated");
    res.status(201).json({ success: true, id });
};

export const updateStation = async (req, res) => {
    await stationsService.updateStation(req.params.id, req.body);
    req.io.emit("stations_updated");
    res.json({ success: true });
};

export const deleteStation = async (req, res) => {
    await stationsService.deleteStation(req.params.id);
    req.io.emit("stations_updated");
    res.json({ success: true });
};
