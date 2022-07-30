import { NextFunction, Request, Response } from "express";
import assert from "node:assert";
import { singleton } from "tsyringe";

import { ConfirmationType } from "../../dal/entities/confirmationEntity";
import { LocalLoginManager, LoginDuplicateType, LoginResult } from "../../managers/localLoginManager";
import { UserManager } from "../../managers/userManger";
import { Credentials } from "../../models/credentials";
import { LocalLogin } from "../../models/localLogin";
import { Phone } from "../../models/phone";
import { extractCredentials } from "../../models/utils/toModelMappers";
import { SpamProtector } from "../../services/spamProtector";
import * as errors from "../commonErrors";
import { disallowedEmailDomain, usernameTaken } from "../commonErrors";
import UserController from "./userController";

@singleton()
export default class LocalUserController extends UserController {
    constructor(private _userManager: UserManager, private _loginManager: LocalLoginManager, private _spamProtector: SpamProtector) {
        super();
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);

        if (this._spamProtector.isDisallowedEmail(credentials.email) === true) {
            this._securityLogger.warn(`Disallowed email provider for user ${credentials.username} with email ${credentials.email}.`);
            return disallowedEmailDomain(next);
        }

        if (this._config.localLogin.username.required && this._spamProtector.isDisallowedUsername(req.body.username) === true) {
            return usernameTaken(next);
        }

        if ((await this.handleLoginDuplicate(next, credentials)) === false) {
            return;
        }

        const username = this._config.localLogin.username.required ? req.body.username : null;
        const userId = await this._userManager.create(username);
        assert(userId);
        let login: LocalLogin = null;
        try {
            login = await this._loginManager.create(credentials, userId, req.body.password);
        } catch (error) {
            await this._userManager.delete(userId);
            throw error;
        }

        await this.pushNewUser(userId, req.body, "local", credentials);

        if (login.email) {
            await this.pushEmailCode(userId, credentials.email);
        } else if (login.phone) {
            await this.pushPhoneCode(userId, credentials.phone);
        }

        res.json({ result: true });
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);

        const result = await this._loginManager.authenticate(credentials, req.body.password);

        if (result.result === LoginResult.userNotFound || result.result === LoginResult.invalidPassword) {
            return errors.invalidCredentials(next);
        }
        if (result.result === LoginResult.emailNotConfirmed) {
            return errors.emailNotConfirmed(next, result.login.email);
        }
        if (result.result === LoginResult.phoneNotConfirmed) {
            return errors.phoneNotConfirmed(next, result.login.phone);
        }

        const userId = result.login.userId;
        if ((await this.handleUserLock(next, userId)) === false) {
            return;
        }

        if ((await this.handleMfa(req, res, userId)) === false) {
            return;
        }

        await this.respondWithSessionOrJwt(req, res, userId);
    }

    private async handleLoginDuplicate(next: NextFunction, credentials: Credentials): Promise<boolean> {
        const duplicate = await this._loginManager.isDuplicate(credentials);
        if (duplicate === LoginDuplicateType.email || duplicate === LoginDuplicateType.phone) {
            errors.userAlreadyExists(next);
            return false;
        }
        if (duplicate === LoginDuplicateType.username) {
            errors.usernameTaken(next);
            return false;
        }
        if (this._config.localLogin.username.required && (await this._userManager.doesUsernameExist(credentials.username)) === true) {
            errors.usernameTaken(next);
            return false;
        }
        return true;
    }

    private async pushEmailCode(userId: string, email: string) {
        const code = await this._loginManager.generateConfirmationCode(userId, email, ConfirmationType.email);
        this._queueService.pushEmailCode(email, code, "confirmAccount");
    }

    private async pushPhoneCode(userId: string, phone: Phone) {
        const code = await this._loginManager.generateConfirmationCode(userId, phone.toString(), ConfirmationType.phone);
        this._queueService.pushPhoneCode(phone, code, "confirmAccount");
    }
}
