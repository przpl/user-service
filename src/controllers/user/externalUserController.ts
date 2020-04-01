import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { UserManager } from "../../managers/userManger";
import { ExternalUser } from "../../middleware/passport";
import { ExternalLoginProvider } from "../../dal/entities/externalLoginEntity";
import UserController from "./userController";
import { ExternalLoginManager } from "../../managers/externalLoginManager";

@singleton()
export default class ExternalUserController extends UserController {
    constructor(private _userManager: UserManager, private _loginManager: ExternalLoginManager) {
        super();
    }

    public async registerOrLogin(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;
        let userId = await this._loginManager.get(externalUser.id, provider);
        if (!userId) {
            userId = await this._userManager.create();
            await this._loginManager.create(userId, externalUser.id, externalUser.email, provider);
            await this.pushNewUser(req.body);
        }

        if (!(await this.handleUserLock(next, userId))) {
            return;
        }

        if (!(await this.handleMfa(req, res, userId))) {
            return;
        }

        this.sendTokens(req, res, userId);
    }
}
