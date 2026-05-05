import * as usersService from "./users.service.js";

export const createUser = async (req, res) => {
    const id = await usersService.createUser(req.body);
    res.status(201).json({ success: true, id });
};

export const updateUser = async (req, res) => {
    await usersService.updateUser(req.params.id, req.body);
    res.json({ success: true });
};

export const getAllUsers = async (req, res) => {
    const users = await usersService.getAllUsers();
    res.json(users);
};

export const deleteUser = async (req, res) => {
    await usersService.deleteUser(req.params.id);
    res.json({ success: true });
};
