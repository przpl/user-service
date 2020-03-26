import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

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

export default class PasswordController {
    constructor(private _userManager: UserManager) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        const { oldPassword, password } = req.body;

        try {
            await this._userManager.changePassword(req.authenticatedUser.sub, oldPassword, password);
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidOldPassword", HttpStatus.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const { email } = req.body;
        let code: string;
        try {
            code = await this._userManager.generatePasswordResetCode(email);
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

        // TODO - send event, new password reset code was generated - backend can send email
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        const { resetCode, password } = req.body;
        try {
            await this._userManager.resetPassword(resetCode, password);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "invalidCode", HttpStatus.FORBIDDEN);
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
