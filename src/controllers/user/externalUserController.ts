import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import UserController from "./userController";

export default class ExternalUserController extends UserController {
    constructor(private _userManager: UserManager, jwtService: JwtService) {
        super(jwtService);
    }

    public async loginWithExternalProvider(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;

        let user: User;
        try {
            user = await this._userManager.loginOrRegisterExternalUser(externalUser.id, provider);
        } catch (error) {
            return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        // TODO notify other services about new user, send data to queue

        this.sendTokens(res, user);
    }
}
