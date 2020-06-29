import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { RoleManager } from "../managers/roleManager";
import { SessionManager } from "../managers/sessionManager";
import { LockManager } from "../managers/lockManager";
import { UserManager } from "../managers/userManger";
import * as errors from "./commonErrors";

@singleton()
export default class InternalController {
    constructor(
        private _userManager: UserManager,
        private _roleManager: RoleManager,
        private _sessionManager: SessionManager,
        private _lockManager: LockManager
    ) {}

    public async addRoleToUser(req: Request, res: Response, next: NextFunction) {
        if ((await this.assertUserExists(next, req.body.userId)) === false) {
            return;
        }

        await this._roleManager.addRole(req.body.userId, req.body.userRole);

        res.json({ result: true });
    }

    public async removeRoleFromUser(req: Request, res: Response, next: NextFunction) {
        if ((await this.assertUserExists(next, req.body.userId)) === false) {
            return;
        }

        const roleExisted = await this._roleManager.removeRole(req.body.userId, req.body.userRole);
        if (roleExisted) {
            await this._sessionManager.revokeAllSessions(req.body.userId);
        }
        res.json({ result: true });
    }

    public async revokeAllUserSessions(req: Request, res: Response, next: NextFunction) {
        if ((await this.assertUserExists(next, req.params.userId)) === false) {
            return;
        }

        await this._sessionManager.revokeAllSessions(req.params.userId);
        res.json({ result: true });
    }

    public async lockOutUser(req: Request, res: Response, next: NextFunction) {
        if ((await this.assertUserExists(next, req.params.userId)) === false) {
            return;
        }

        const { until, reason, by } = req.body.lock;
        const untilDate = new Date(until);
        await this._lockManager.lock(req.params.userId, untilDate, reason, by);
        await this._sessionManager.revokeAllSessions(req.params.userId);

        res.json({ result: true });
    }

    public async unlockUser(req: Request, res: Response, next: NextFunction) {
        if ((await this.assertUserExists(next, req.params.userId)) === false) {
            return;
        }

        const result = await this._lockManager.unlock(req.params.userId);

        res.json({ result: result });
    }

    private async assertUserExists(next: NextFunction, userId: string): Promise<boolean> {
        if ((await this._userManager.exists(userId)) === false) {
            errors.userNotExists(next);
            return false;
        }
        return true;
    }
}
