import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

const ERROR_MSG = {
    isEmail: "Not an e-mail",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isString: "Not a string",
};

// TODO max length from config, validation of other fields based on config file
export default class Validator {
    private _login = [
        check("email")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .isLength({ min: 5, max: 70 })
            .withMessage(ERROR_MSG.isLength)
            .trim()
            .isEmail()
            .withMessage(ERROR_MSG.isEmail)
            .normalizeEmail(),

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
            .isLength({ min: 1, max: 2048 })
            .withMessage(ERROR_MSG.isLength)
            .trim()
            .isJWT()
            .withMessage(ERROR_MSG.isJwt),
    ];

    get login() {
        return [...this._login, this.validate];
    }

    get register() {
        return [...this._login, this.validate];
    }

    get refreshToken() {
        return [...this._refreshToken, this.validate];
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
            return forwardError(next, errorsList, HttpStatus.BAD_REQUEST);
        }

        next();
    }
}
