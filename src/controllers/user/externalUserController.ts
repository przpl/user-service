import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { JwtService } from "../../services/jwtService";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";
import { QueueService } from "../../services/queueService";
import { RoleManager } from "../../managers/roleManager";
import { ErrorResponse } from "../../interfaces/errorResponse";
import { ExternalLoginManager } from "../../managers/externalLoginManager";
import { LockManager } from "../../managers/lockManager";

@singleton()
export default class ExternalUserController extends UserController {
    constructor(
        private _userManager: UserManager,
        sessionManager: SessionManager,
        roleManager: RoleManager,
        private queueService: QueueService,
        jwtService: JwtService,
        private _externalLoginManager: ExternalLoginManager,
        private _lockManager: LockManager
    ) {
        super(sessionManager, roleManager, jwtService);
    }

    public async loginWithExternalProvider(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;
        let userId = await this._externalLoginManager.get(externalUser.id, provider);
        if (!userId) {
            userId = await this._userManager.create();
            await this._externalLoginManager.create(userId, externalUser.id, externalUser.email, provider);
        }

        const lockReason = await this._lockManager.getReason(userId);
        if (lockReason) {
            const errors: ErrorResponse = {
                id: "userLockedOut",
                data: { reason: lockReason },
            };
            return forwardError(next, errors, HttpStatus.FORBIDDEN);
        }

        this.sendTokens(req, res, userId);
    }
}
