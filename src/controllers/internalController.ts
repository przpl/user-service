import { Request, Response, NextFunction } from "express";

import { RoleManager } from "../managers/roleManager";

export default class InternalController {
    constructor(private _roleManager: RoleManager) {}

    public async addRoleToUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;
        await this._roleManager.addRole(userId, userRole);
        res.json({ result: true });
    }

    public async removeRoleFromUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;
        await this._roleManager.removeRole(userId, userRole);
        res.json({ result: true });
    }
}
