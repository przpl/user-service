import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { UserManager } from "../managers/userManger";
import {
    UserNotConfirmedException,
    UserNotExistsException,
    InvalidPasswordException,
    UserNotLocalException,
    UserLockedOutException,
} from "../exceptions/userExceptions";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { ErrorResponse } from "../interfaces/errorResponse";

@singleton()
export default class PasswordController {
    constructor(private _userManager: UserManager) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._userManager.changePassword(req.authenticatedUser.sub, req.body.old, req.body.new);
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
        let code: string;
        try {
            code = await this._userManager.generatePasswordResetCode(req.body.email, req.body.phone);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return res.json({ result: true });
            } else if (error instanceof UserNotLocalException) {
                return res.json({ result: true });
            } else if (error instanceof UserNotConfirmedException) {
                return res.json({ result: true });
            } else if (error instanceof UserLockedOutException) {
                return res.json({ result: true });
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });

        // TODO - send event, new password reset code was generated - backend can send email or SMS
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            await this._userManager.resetPassword(req.body.token, req.body.password);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "invalidToken", HttpStatus.FORBIDDEN);
            } else if (error instanceof ExpiredResetCodeException) {
                return forwardError(next, "codeExpired", HttpStatus.BAD_REQUEST);
            } else if (error instanceof UserLockedOutException) {
                const errors: ErrorResponse = {
                    id: "userLockedOut",
                    data: { reason: (error as UserLockedOutException).reason },
                };
                return forwardError(next, errors, HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }
}
