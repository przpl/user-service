import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { UserManager } from "../../managers/userManger";
import UserController from "./userController";
import { LocalLoginManager, LoginDuplicateType, LoginResult, LoginOperationResult } from "../../managers/localLoginManager";
import { Credentials } from "../../models/credentials";
import { extractCredentials } from "../../models/utils/toModelMappers";
import { Phone } from "../../models/phone";
import { ConfirmationType } from "../../dal/entities/confirmationEntity";
import * as errors from "../commonErrors";
import { forwardInternalError } from "../../utils/expressUtils";

@singleton()
export default class LocalUserController extends UserController {
    constructor(private _userManager: UserManager, private _loginManager: LocalLoginManager) {
        super();
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);

        if ((await this.handleLoginDuplicate(next, credentials)) === false) {
            return;
        }

        const userId = await this._userManager.create();
        const login = await this._loginManager.create(credentials, userId, req.body.password);

        await this.pushNewUser(req.body, credentials);
        if (login.email) {
            await this.pushEmailCode(userId, credentials.email);
        } else if (login.phone) {
            await this.pushPhoneCode(userId, credentials.phone);
        }

        res.json({ result: true });
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);

        let result: LoginOperationResult = null;

        try {
            result = await this._loginManager.authenticate(credentials, req.body.password);
        } catch (error) {
            return forwardInternalError(next, error);
        }

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

        this.sendTokens(req, res, userId);
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
        return true;
    }

    private async pushEmailCode(userId: string, email: string) {
        const code = await this._loginManager.generateConfirmationCode(userId, email, ConfirmationType.email);
        this._queueService.pushEmailCode(email, code);
    }

    private async pushPhoneCode(userId: string, phone: Phone) {
        const code = await this._loginManager.generateConfirmationCode(userId, phone.toString(), ConfirmationType.phone);
        this._queueService.pushPhoneCode(phone, code);
    }
}
