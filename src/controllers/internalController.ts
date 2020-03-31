import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { RoleManager } from "../managers/roleManager";
import { SessionManager } from "../managers/sessionManager";
import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { UserNotExistsException } from "../exceptions/userExceptions";
import { LockManager } from "../managers/lockManager";

// TODO - handle errors, send more information than on public endpoints
@singleton()
export default class InternalController {
    constructor(private _roleManager: RoleManager, private _sessionManager: SessionManager, private _lockManager: LockManager) {}

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

    public async revokeAllUserSessions(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;
        await this._sessionManager.revokeAllSessions(userId);
        res.json({ result: true });
    }

    public async lockOutUser(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;
        const { lockUntil, lockReason } = req.body;
        const lockUntilDate = new Date(lockUntil);
        try {
            await this._lockManager.lock(userId, lockUntilDate, lockReason);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "userNotExists", HttpStatus.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }

        await this._sessionManager.revokeAllSessions(userId);

        res.json({ result: true });
    }

    public async unlockUser(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;
        try {
            await this._lockManager.unlock(userId);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "userNotExists", HttpStatus.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }
        res.json({ result: true });
    }
}
