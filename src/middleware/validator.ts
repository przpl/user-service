import { Request, Response, NextFunction } from "express";
import { validationResult, body, ValidationChain } from "express-validator";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { JsonConfig } from "../utils/config";

const ERROR_MSG = {
    isEmail: "Not an e-mail",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isHexadecimal: "Invalid format",
    isString: "Not a string",
};

const HMAC_256_SIG_LENGTH = 64;

// TODO max length from config, validation of other fields based on config file
export default class Validator {
    private _email: ValidationChain[] = [];
    private _emailSignature: ValidationChain[] = [
        body("signature")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: HMAC_256_SIG_LENGTH, max: HMAC_256_SIG_LENGTH })
            .withMessage(ERROR_MSG.isLength)
            .isHexadecimal()
            .withMessage(ERROR_MSG.isHexadecimal),
    ];
    private _password: ValidationChain[] = [];
    private _refreshToken: ValidationChain[] = [];
    private _register: ValidationChain[] = [];

    constructor(jsonConfig: JsonConfig) {
        this._email.push(
            body("email")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .trim()
                .isLength({ min: 5, max: jsonConfig.fieldsValidation.email.maxLength })
                .withMessage(ERROR_MSG.isLength)
                .isEmail()
                .withMessage(ERROR_MSG.isEmail)
                .normalizeEmail()
        );

        this._password.push(
            body("password")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .isLength({ min: 6, max: jsonConfig.fieldsValidation.password.maxLength })
                .withMessage(ERROR_MSG.isLength)
        );

        this._refreshToken.push(
            body("refreshToken")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .trim()
                .isLength({ min: 1, max: jsonConfig.fieldsValidation.refreshToken.maxLength })
                .withMessage(ERROR_MSG.isLength)
                .isJWT()
                .withMessage(ERROR_MSG.isJwt)
        );

        for (const field of jsonConfig.payload.register) {
            const validation = body(field.name);
            if (field.isString) {
                validation.isString().withMessage(ERROR_MSG.isString);
            }
            if (field.trim) {
                validation.trim();
            }
            if (field.isLength) {
                validation.isLength({ min: field.isLength.min, max: field.isLength.max }).withMessage(ERROR_MSG.isLength);
            }

            this._register.push(validation);
        }
    }

    get login() {
        return [...this._email, ...this._password, this.validate];
    }

    get register() {
        return [...this._email, ...this._password, ...this._register, this.validate];
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
