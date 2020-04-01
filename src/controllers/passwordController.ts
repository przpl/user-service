import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { NotFoundException, InvalidPasswordException, UserNotLocalException } from "../exceptions/userExceptions";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { LockManager } from "../managers/lockManager";
import { extractCredentialsWithoutUsername } from "../models/utils/toModelMappers";
import { QueueService } from "../services/queueService";
import { PrimaryLoginType } from "../models/credentials";

@singleton()
export default class PasswordController {
    constructor(private _lockManager: LockManager, private _loginManager: LocalLoginManager, private _queueService: QueueService) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._loginManager.changePassword(req.authenticatedUser.sub, req.body.old, req.body.new);
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidOldPassword", HttpStatus.UNAUTHORIZED);
            } else if (error instanceof UserNotLocalException) {
                return forwardError(next, "notALocalUser", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentialsWithoutUsername(req.body);
        const login = await this._loginManager.getByCredentials(credentials);
        if (!login) {
            return res.json({ result: true });
        }

        const lockReason = await this._lockManager.getReason(login.userId);
        if (lockReason) {
            return res.json({ result: true });
        }

        const code = await this._loginManager.generatePasswordResetCode(login);

        const primary = credentials.getPrimary();
        if (primary === PrimaryLoginType.email) {
            this._queueService.pushEmailCode(credentials.email, code);
        } else if (primary === PrimaryLoginType.phone) {
            this._queueService.pushSmsCode(credentials.phone, code);
        }

        res.json({ result: true });
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._loginManager.resetPassword(req.body.token, req.body.password);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return forwardError(next, "invalidToken", HttpStatus.FORBIDDEN);
            } else if (error instanceof ExpiredResetCodeException) {
                return forwardError(next, "codeExpired", HttpStatus.BAD_REQUEST);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }
}
