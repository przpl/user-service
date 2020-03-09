import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

const ERROR_MSG = {
    isEmail: "Not an e-mail",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isHexadecimal: "Invalid format",
    isString: "Not a string",
};

// TODO max length from config, validation of other fields based on config file
export default class Validator {
    private _email = [
        check("email")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: 5, max: 70 })
            .withMessage(ERROR_MSG.isLength)
            .isEmail()
            .withMessage(ERROR_MSG.isEmail)
            .normalizeEmail(),
    ];

    private _emailSignature = [
        check("signature")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: 64, max: 64 })
            .withMessage(ERROR_MSG.isLength)
            .isHexadecimal()
            .withMessage(ERROR_MSG.isHexadecimal),
    ];

    private _password = [
        check("password")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .isLength({ min: 6, max: 128 })
            .withMessage(ERROR_MSG.isLength),
    ];

    private _refreshToken = [
        check("refreshToken")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: 1, max: 2048 })
            .withMessage(ERROR_MSG.isLength)
            .isJWT()
            .withMessage(ERROR_MSG.isJwt),
    ];

    get login() {
        return [...this._email, ...this._password, this.validate];
    }

    get register() {
        return [...this._email, ...this._password, this.validate];
    }

    get refreshToken() {
        return [...this._refreshToken, this.validate];
    }

    get confirmEmail() {
        return [...this._email, ...this._emailSignature, this.validate];
    }

    private validate(req: Request, res: Response, next: NextFunction) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorsList: ErrorResponse[] = [
                {
                    id: "dataValidationFailed",
                    data: errors.array(),
                },
            ];
            return forwardError(next, errorsList, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        next();
    }
}
