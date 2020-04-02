import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { RoleManager } from "../managers/roleManager";
import { SessionManager } from "../managers/sessionManager";
import { forwardError } from "../utils/expressUtils";
import { LockManager } from "../managers/lockManager";
import { UserManager } from "../managers/userManger";

@singleton()
export default class InternalController {
    constructor(
        private _userManager: UserManager,
        private _roleManager: RoleManager,
        private _sessionManager: SessionManager,
        private _lockManager: LockManager
    ) {}

    public async addRoleToUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;

        if (!(await this.assertUserExists(next, userId))) {
            return;
        }

        await this._roleManager.addRole(userId, userRole);
        res.json({ result: true });
    }

    public async removeRoleFromUser(req: Request, res: Response, next: NextFunction) {
        const { userId, userRole } = req.body;

        if (!(await this.assertUserExists(next, userId))) {
            return;
        }

        const roleExisted = await this._roleManager.removeRole(userId, userRole);
        if (roleExisted) {
            await this._sessionManager.revokeAllSessions(userId);
        }
        res.json({ result: true });
    }

    public async revokeAllUserSessions(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;

        if (!(await this.assertUserExists(next, userId))) {
            return;
        }

        await this._sessionManager.revokeAllSessions(userId);
        res.json({ result: true });
    }

    public async lockOutUser(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;

        if (!(await this.assertUserExists(next, userId))) {
            return;
        }

        const { until, reason, by } = req.body.lock;
        const untilDate = new Date(until);
        await this._lockManager.lock(userId, untilDate, reason, by);
        await this._sessionManager.revokeAllSessions(userId);

        res.json({ result: true });
    }

    public async unlockUser(req: Request, res: Response, next: NextFunction) {
        const { userId } = req.params;

        if (!(await this.assertUserExists(next, userId))) {
            return;
        }

        const result = await this._lockManager.unlock(userId);

        res.json({ result: result });
    }

    private async assertUserExists(next: NextFunction, userId: string): Promise<boolean> {
        if (!(await this._userManager.exists(userId))) {
            forwardError(next, "userNotExists", HttpStatus.BAD_REQUEST);
            return false;
        }
        return true;
    }
}
