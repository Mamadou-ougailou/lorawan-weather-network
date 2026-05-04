import * as mappingsService from "./mappings.service.js";

export const getAllMappings = async (_req, res) => {
    const mappings = await mappingsService.getAllMappings();
    res.json(mappings);
};

export const createMapping = async (req, res) => {
    const id = await mappingsService.createMapping(req.body);
    res.status(201).json({ success: true, id });
};

export const updateMapping = async (req, res) => {
    await mappingsService.updateMapping(req.params.id, req.body);
    res.json({ success: true });
};

export const deleteMapping = async (req, res) => {
    await mappingsService.deleteMapping(req.params.id);
    res.json({ success: true });
};
