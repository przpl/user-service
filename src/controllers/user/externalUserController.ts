import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { UserManager } from "../../managers/userManger";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLoginEntity";
import UserController from "./userController";
import { ExternalLoginManager } from "../../managers/externalLoginManager";
import { RequestBody } from "../../types/express/requestBody";

@singleton()
export default class ExternalUserController extends UserController {
    constructor(private _userManager: UserManager, private _loginManager: ExternalLoginManager) {
        super();
    }

    public async registerOrLogin(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;
        let userId = await this._loginManager.getUserId(externalUser.id, provider);
        if (!userId) {
            // TODO if other info is required, send registration token

            userId = await this.register(req.body, externalUser.id, externalUser.email, provider);
        }

        if ((await this.handleUserLock(next, userId)) === false) {
            return;
        }

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

        await this.pushNewUser(body); // TODO handle error
        return userId;
    }
}
