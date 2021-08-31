import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { singleton } from "tsyringe";

import { ExternalLoginProvider } from "../../dal/entities/externalLoginEntity";
import { ExternalLoginManager } from "../../managers/externalLoginManager";
import { UserManager } from "../../managers/userManger";
import { ExternalUser } from "../../middleware/passport";
import { Credentials } from "../../models/credentials";
import { ExternalUserJwtService } from "../../services/externalUserJwtService";
import { RequestBody } from "../../types/express/requestBody";
import { forwardError } from "../../utils/expressUtils";
import { usernameTaken } from "../commonErrors";
import UserController from "./userController";

@singleton()
export default class ExternalUserController extends UserController {
    constructor(
        private _userManager: UserManager,
        private _loginManager: ExternalLoginManager,
        private _externalJwtService: ExternalUserJwtService
    ) {
        super();
    }

    public async registerOrLogin(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;
        let userId = await this._loginManager.getUserId(externalUser.id, provider);
        if (!userId) {
            if (
                this._config.localLogin.username.required ||
                this._config.localLogin.phone.required ||
                Object.keys(this._config.additionalFields.registerEndpoint).length > 0
            ) {
                return res.json({ registrationToken: this._externalJwtService.issueToken(externalUser, provider) });
            }
            userId = await this.register(req.body, externalUser.id, externalUser.email, provider);
        } else if ((await this.handleUserLock(next, userId)) === false) {
            return;
        }

        this.respondWithSessionOrJwt(req, res, userId);
    }

    public async finishRegistration(req: Request, res: Response, next: NextFunction) {
        if (this._config.localLogin.username.required && (await this._userManager.doesUsernameExist(req.body.username)) === true) {
            return usernameTaken(next);
        }

        const tokenData = this._externalJwtService.decodeToken(req.body.token);
        let userId = await this._loginManager.getUserId(tokenData.id, tokenData.provider);
        if (userId) {
            return forwardError(next, "userAlreadyRegistered", StatusCodes.BAD_REQUEST);
        }

        userId = await this.register(req.body, tokenData.id, tokenData.email, tokenData.provider);

        this.respondWithSessionOrJwt(req, res, userId);
    }

    private async register(body: RequestBody, externalId: string, email: string, provider: ExternalLoginProvider): Promise<string> {
        const username = this._config.localLogin.username.required ? body.username : null;
        const userId = await this._userManager.create(username);
        try {
            await this._loginManager.create(userId, externalId, email, provider);
        } catch (error) {
            await this._userManager.delete(userId);
            throw error;
        }

        await this.pushNewUser(userId, body, "external", new Credentials(email, body.username, null));

        return userId;
    }
}
