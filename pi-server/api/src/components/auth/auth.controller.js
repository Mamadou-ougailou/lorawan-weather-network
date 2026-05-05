import * as authService from "./auth.service.js";

export const login = async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
};

export const getMe = async (req, res) => {
    const user = await authService.getMe(req.user.id);
    res.json(user);
};
