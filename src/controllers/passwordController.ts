import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { UserManager } from "../managers/userManger";
import { UserNotConfirmedException, UserNotExistsException, InvalidPasswordException } from "../exceptions/userExceptions";
import { ExpiredResetCodeException } from "../exceptions/exceptions";

export default class PasswordController {
    constructor(private _userManager: UserManager) {}

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        const { oldPassword, password } = req.body;

        try {
            await this._userManager.changePassword(req.authenticatedUser.sub, oldPassword, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            if (error instanceof InvalidPasswordException) {
                errors.push({ id: "invalidOldPassword" });
                responseCode = HttpStatus.UNAUTHORIZED;
            }
            return forwardError(next, errors, responseCode, error);
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
            } else if (error instanceof UserNotConfirmedException) {
                return res.json({ result: true });
            }
            return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        res.json({ result: true });

        // TODO - send event, new password reset code was generated - backend can send email
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        const { code, password } = req.body;
        try {
            await this._userManager.resetPassword(code, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.BAD_REQUEST;
            if (error instanceof UserNotExistsException) {
                errors.push({ id: "invalidCode" });
            } else if (error instanceof ExpiredResetCodeException) {
                errors.push({ id: "codeExpired" });
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode, error);
        }

        res.json({ result: true });
    }
}
