import { Request, Response, NextFunction } from "express";
import { validationResult, body, ValidationChain } from "express-validator";
import HttpStatus from "http-status-codes";
import PasswordValidator from "password-validator";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { JsonConfig } from "../utils/config/jsonConfig";

const ERROR_MSG = {
    isEmail: "Not an e-mail",
    isHexadecimal: "Invalid format",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isString: "Not a string",
};

const HMAC_256_SIG_LENGTH = 64;
const PASSWORD_RESET_CODE_LENGTH = 10;

type ValidatorArray = (ValidationChain | ((req: Request, res: Response<any>, next: NextFunction) => void))[];

export default class Validator {
    // #region Validation chains
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
    private _weakPassword: ValidationChain[] = [];
    private _resetPassword: ValidationChain[] = [
        body("code")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: PASSWORD_RESET_CODE_LENGTH, max: PASSWORD_RESET_CODE_LENGTH })
            .withMessage(ERROR_MSG.isLength)
            .isHexadecimal()
            .withMessage(ERROR_MSG.isHexadecimal),
    ];
    private _recaptcha: ValidationChain = body("recaptchaKey")
        .isString()
        .withMessage(ERROR_MSG.isString)
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage(ERROR_MSG.isLength);
    // #endregion

    // #region Validators
    public login: ValidatorArray = [];
    public register: ValidatorArray = [];
    public changePassword: ValidatorArray = [];
    public refreshToken: ValidatorArray = [];
    public confirmEmail: ValidatorArray = [];
    public forgotPassword: ValidatorArray = [];
    public resetPassword: ValidatorArray = [];
    // #endregion

    constructor(jsonConfig: JsonConfig) {
        const config = jsonConfig.commonFields;
        this._email.push(
            body("email")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .trim()
                .isLength({ min: 5, max: config.email.isLength.max })
                .withMessage(ERROR_MSG.isLength)
                .isEmail()
                .withMessage(ERROR_MSG.isEmail)
                .normalizeEmail()
        );

        let passwordErrorMsg = `Password should have minimum ${config.password.isLength.min} characters`;
        const passwordSchema = new PasswordValidator();
        passwordSchema.is().min(config.password.isLength.min);
        passwordSchema.is().max(config.password.isLength.max);
        if (config.password.hasDigits) {
            passwordSchema.has().digits();
            passwordErrorMsg += ", one digit";
        }
        if (config.password.hasSymbols) {
            passwordSchema.has().symbols();
            passwordErrorMsg += ", one symbol";
        }
        if (config.password.hasUppercase) {
            passwordSchema.has().uppercase();
            passwordErrorMsg += ", one uppercase";
        }
        if (config.password.hasLowercase) {
            passwordSchema.has().lowercase();
            passwordErrorMsg += ", one lowercase";
        }
        this._password.push(
            body("password")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .custom(value => passwordSchema.validate(value))
                .withMessage(passwordErrorMsg)
        );

        this._weakPassword.push(
            body("password")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .isLength({ min: 1, max: config.password.isLength.max })
                .withMessage(ERROR_MSG.isLength)
        );

        this._refreshToken.push(
            body("refreshToken")
                .isString()
                .withMessage(ERROR_MSG.isString)
                .trim()
                .isLength({ min: 1, max: config.refreshToken.isLength.max })
                .withMessage(ERROR_MSG.isLength)
                .isJWT()
                .withMessage(ERROR_MSG.isJwt)
        );

        for (const fieldName of Object.keys(jsonConfig.additionalFields.registerEndpoint)) {
            const field = jsonConfig.additionalFields.registerEndpoint[fieldName];
            const validation = body(fieldName);
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

        this.login = [...this._email, ...this._weakPassword, this.validate];
        this.register = [...this._email, ...this._password, ...this._register, this.validate];
        this.changePassword = [...this._password, this.validate];
        this.refreshToken = [...this._refreshToken, this.validate];
        this.confirmEmail = [...this._email, ...this._emailSignature, this.validate];
        this.forgotPassword = [...this._email, this.validate];
        this.resetPassword = [...this._resetPassword, ...this._password, this.validate];

        const recaptchaEnabled = jsonConfig.security.reCaptcha.protectedEndpoints;
        if (recaptchaEnabled.login) {
            this.login.unshift(this._recaptcha);
        }
        if (recaptchaEnabled.register) {
            this.register.unshift(this._recaptcha);
        }
        if (recaptchaEnabled.confirmEmail) {
            this.confirmEmail.unshift(this._recaptcha);
        }
        if (recaptchaEnabled.forgotPassword) {
            this.forgotPassword.unshift(this._recaptcha);
        }
        if (recaptchaEnabled.resetPassword) {
            this.resetPassword.unshift(this._recaptcha);
        }
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
