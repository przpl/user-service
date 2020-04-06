import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import UserController from "./userController";
import { ErrorResponse } from "../../interfaces/errorResponse";
import { LocalLoginManager, LoginDuplicateType, LoginResult } from "../../managers/localLoginManager";
import { Credentials } from "../../models/credentials";
import { extractCredentials } from "../../models/utils/toModelMappers";
import { Phone } from "../../models/phone";
import { dtoFromPhoneModel } from "../../models/mappers";
import { ConfirmationType } from "../../dal/entities/confirmationEntity";

@singleton()
export default class LocalUserController extends UserController {
    constructor(private _userManager: UserManager, private _loginManager: LocalLoginManager) {
        super();
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);

        if (!(await this.handleLoginDuplicate(next, credentials))) {
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

        const result = await this._loginManager.authenticate(credentials, req.body.password);
        if (result.result === LoginResult.userNotFound || result.result === LoginResult.invalidPassword) {
            return forwardError(next, "invalidCredentials", HttpStatus.UNAUTHORIZED);
        }
        if (result.result === LoginResult.emailNotConfirmed) {
            const errors: ErrorResponse = {
                id: "emailNotConfirmed",
                data: { user: { email: result.login.email } }, // user can login with username or phone number, client app may need reference
            };
            return forwardError(next, errors, HttpStatus.FORBIDDEN);
        }
        if (result.result === LoginResult.phoneNotConfirmed) {
            const errors: ErrorResponse = {
                id: "phoneNotConfirmed",
                data: { user: { phone: dtoFromPhoneModel(result.login.phone) } }, // user can login with username or phone number, client app may need reference
            };
            return forwardError(next, errors, HttpStatus.FORBIDDEN);
        }

        const userId = result.login.userId;
        if (!(await this.handleUserLock(next, userId))) {
            return;
        }

        if (!(await this.handleMfa(req, res, userId))) {
            return;
        }

        this.sendTokens(req, res, userId);
    }

    private async handleLoginDuplicate(next: NextFunction, credentials: Credentials): Promise<boolean> {
        const duplicate = await this._loginManager.isDuplicate(credentials);
        if (duplicate === LoginDuplicateType.email || duplicate === LoginDuplicateType.phone) {
            forwardError(next, "userAlreadyExists", HttpStatus.BAD_REQUEST);
            return false;
        }
        if (duplicate === LoginDuplicateType.username) {
            forwardError(next, "usernameAlreadyUsed", HttpStatus.BAD_REQUEST);
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
