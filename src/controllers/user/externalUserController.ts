import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardInternalError, forwardError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";
import { QueueService } from "../../services/queueService";
import { RoleManager } from "../../managers/roleManager";
import { UserLockedOutException } from "../../exceptions/userExceptions";
import { ErrorResponse } from "../../interfaces/errorResponse";

@singleton()
export default class ExternalUserController extends UserController {
    constructor(
        private _userManager: UserManager,
        sessionManager: SessionManager,
        roleManager: RoleManager,
        private queueService: QueueService,
        jwtService: JwtService
    ) {
        super(sessionManager, roleManager, jwtService);
    }

    public async loginWithExternalProvider(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;

        let user: User;
        try {
            user = await this._userManager.loginOrRegisterExternalUser(externalUser.id, externalUser.email, provider);
        } catch (error) {
            if (error instanceof UserLockedOutException) {
                const errors: ErrorResponse = {
                    id: "userLockedOut",
                    data: { reason: (error as UserLockedOutException).reason },
                };
                return forwardError(next, errors, HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        // TODO notify other services about new user, send data to queue

        this.sendTokens(req, res, user);
    }
}
