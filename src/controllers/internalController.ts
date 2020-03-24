import { Request, Response, NextFunction } from "express";

import { RoleManager } from "../managers/roleManager";
import { SessionManager } from "../managers/sessionManager";

export default class InternalController {
    constructor(private _roleManager: RoleManager, private _sessionManager: SessionManager) {}

    public async addRoleToUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;
        await this._roleManager.addRole(userId, userRole);
        res.json({ result: true });
    }

    public async removeRoleFromUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;
        const roleExisted = await this._roleManager.removeRole(userId, userRole);
        if (roleExisted) {
            await this._sessionManager.revokeAllSessions(userId);
        }
        res.json({ result: true });
    }
}
