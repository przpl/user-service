import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { UserManager } from "../../managers/userManger";
import { ExternalLoginProvider } from "../../dal/entities/externalLoginEntity";
import UserController from "./userController";
import { ExternalLoginManager } from "../../managers/externalLoginManager";
import { RequestBody } from "../../types/express/requestBody";
import { ExternalUserJwtService } from "../../services/externalUserJwtService";
import { ExternalUser } from "../../middleware/passport";

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

        this.sendTokens(req, res, userId);
    }

    public async finishRegistration(req: Request, res: Response, next: NextFunction) {
        const tokenData = this._externalJwtService.decodeToken(req.body.token);
        const userId = await this.register(req.body, tokenData.id, tokenData.email, tokenData.provider);

        this.sendTokens(req, res, userId);
    }

    private async register(body: RequestBody, externalId: string, email: string, provider: ExternalLoginProvider): Promise<string> {
        const userId = await this._userManager.create();
        try {
            await this._loginManager.create(userId, externalId, email, provider);
        } catch (error) {
            await this._userManager.delete(userId);
            throw error;
        }

        await this.pushNewUser(body);

        return userId;
    }
}
