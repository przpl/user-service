import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { UserNotConfirmedException, UserNotExistsException, InvalidPasswordException, UserNotLocalException } from "../exceptions/userExceptions";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { LockManager } from "../managers/lockManager";
import { extractCredentials } from "../models/utils/toModelMappers";

@singleton()
export default class PasswordController {
    constructor(private _lockManager: LockManager, private _localLoginManager: LocalLoginManager) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._localLoginManager.changePassword(req.authenticatedUser.sub, req.body.old, req.body.new);
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidOldPassword", HttpStatus.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }

    // TODO check if user or email is enabled
    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const credentials = extractCredentials(req.body);
        const login = await this._localLoginManager.getByLogin(credentials);
        const lockReason = await this._lockManager.getReason(login.userId);
        if (lockReason) {
            return res.json({ result: true });
        }

        let code: string;
        try {
            code = await this._localLoginManager.generatePasswordResetCode(login, credentials);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return res.json({ result: true });
            } else if (error instanceof UserNotLocalException) {
                return res.json({ result: true });
            } else if (error instanceof UserNotConfirmedException) {
                return res.json({ result: true });
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });

        // TODO - send event, new password reset code was generated - backend can send email or SMS
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._localLoginManager.resetPassword(req.body.token, req.body.password);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "invalidToken", HttpStatus.FORBIDDEN);
            } else if (error instanceof ExpiredResetCodeException) {
                return forwardError(next, "codeExpired", HttpStatus.BAD_REQUEST);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }
}
