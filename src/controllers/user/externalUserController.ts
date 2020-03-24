import { Request, Response, NextFunction } from "express";

import { forwardInternalError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";
import { QueueService } from "../../services/queueService";
import { RoleManager } from "../../managers/roleManager";

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
            user = await this._userManager.loginOrRegisterExternalUser(externalUser.id, provider);
        } catch (error) {
            return forwardInternalError(next, error);
        }

        // TODO notify other services about new user, send data to queue

        this.sendTokens(req, res, user);
    }
}
