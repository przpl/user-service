import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { forwardInternalError } from "../utils/expressUtils";
import { NotFoundException, InvalidPasswordException, UserNotLocalException } from "../exceptions/userExceptions";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { LockManager } from "../managers/lockManager";
import { extractCredentialsWithoutUsername } from "../models/utils/toModelMappers";
import { MessageBroker } from "../services/messageBroker";
import * as errors from "./commonErrors";
import SecurityLogger from "../utils/securityLogger";
import { Config } from "../utils/config/config";

@singleton()
export default class PasswordController {
    constructor(
        private _lockManager: LockManager,
        private _loginManager: LocalLoginManager,
        private _queueService: MessageBroker,
        private _securityLogger: SecurityLogger,
        private _config: Config
    ) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._loginManager.changePassword(req.authenticatedUser.sub, req.body.old, req.body.new);
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return errors.invalidPassword(next);
            } else if (error instanceof UserNotLocalException) {
                return errors.notLocalUser(next);
            }
            return forwardInternalError(next, error);
        }

        this._securityLogger.info(`Password changed for user ${req.authenticatedUser.sub} by ${req.ip}`);

        res.json({ result: true });
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentialsWithoutUsername(req.body);
        const login = await this._loginManager.getByCredentials(credentials);
        if (!login) {
            return res.json({ result: true });
        }

        if (await this._lockManager.getActive(login.userId)) {
            return res.json({ result: true });
        }

        const method = this._config.passwordReset.method;
        const code = await this._loginManager.generatePasswordResetCode(login.userId, method);

        if (method === "email") {
            this._queueService.pushEmailCode(credentials.email, code, "forgotPassword");
        } else if (method === "phone") {
            this._queueService.pushPhoneCode(credentials.phone, code, "forgotPassword");
        }

        this._securityLogger.info(`Forgot password called for user ${login.userId} by ${req.ip}`);

        res.json({ result: true });
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        let userId: string;
        try {
            userId = await this._loginManager.resetPassword(req.body.token, req.body.password);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return errors.invalidToken(next);
            } else if (error instanceof ExpiredResetCodeException) {
                return errors.passwordCodeExpired(next);
            }
            return forwardInternalError(next, error);
        }

        this._securityLogger.info(`Password reset for user ${userId} by ${req.ip}`);

        res.json({ result: true });
    }
}
