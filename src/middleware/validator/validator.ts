import { Request, Response, NextFunction } from "express";
import { validationResult, body, ValidationChain } from "express-validator";
import HttpStatus from "http-status-codes";
import PasswordValidator from "password-validator";

import { forwardError } from "../../utils/expressUtils";
import { ErrorResponse } from "../../interfaces/errorResponse";
import { JsonConfig } from "../../utils/config/jsonConfig";
import { FIELD_ERROR_MSG, fieldValidators } from "./fieldValidators";

type ValidatorArray = (ValidationChain | ((req: Request, res: Response<any>, next: NextFunction) => void))[];

export default class Validator {
    public login: ValidatorArray = [];
    public register: ValidatorArray = [];
    public changePassword: ValidatorArray = [];
    public refreshToken: ValidatorArray = [];
    public logout: ValidatorArray = [];
    public confirmEmail: ValidatorArray = [];
    public resendEmail: ValidatorArray = [];
    public forgotPassword: ValidatorArray = [];
    public resetPassword: ValidatorArray = [];
    public loginWithGoogle: ValidatorArray = [];
    public loginWithFacebook: ValidatorArray = [];
    public loginWithMfa: ValidatorArray = [];
    public enableMfa: ValidatorArray = [];
    public disbleMfa: ValidatorArray = [];

    constructor(jsonConfig: JsonConfig) {
        const config = jsonConfig.commonFields;
        fieldValidators.email = body("email")
            .isString()
            .withMessage(FIELD_ERROR_MSG.isString)
            .trim()
            .isLength({ min: 5, max: config.email.isLength.max })
            .withMessage(FIELD_ERROR_MSG.isLength)
            .isEmail()
            .withMessage(FIELD_ERROR_MSG.isEmail)
            .normalizeEmail();

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
        fieldValidators.password = name =>
            body(name)
                .isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .custom(value => passwordSchema.validate(value))
                .withMessage(passwordErrorMsg);

        fieldValidators.weakPassword = body("password")
            .isString()
            .withMessage(FIELD_ERROR_MSG.isString)
            .isLength({ min: 1, max: config.password.isLength.max })
            .withMessage(FIELD_ERROR_MSG.isLength);

        fieldValidators.oldPassword = body("old")
            .isString()
            .withMessage(FIELD_ERROR_MSG.isString)
            .isLength({ min: 1, max: config.password.isLength.max })
            .withMessage(FIELD_ERROR_MSG.isLength);

        for (const fieldName of Object.keys(jsonConfig.additionalFields.registerEndpoint)) {
            const field = jsonConfig.additionalFields.registerEndpoint[fieldName];
            const validation = body(fieldName);
            if (field.isString) {
                validation.isString().withMessage(FIELD_ERROR_MSG.isString);
            }
            if (field.trim) {
                validation.trim();
            }
            if (field.isLength) {
                validation.isLength({ min: field.isLength.min, max: field.isLength.max }).withMessage(FIELD_ERROR_MSG.isLength);
            }

            fieldValidators.register = validation;
        }

        this.login = [fieldValidators.email, fieldValidators.weakPassword, this.validate];
        this.register = [fieldValidators.email, fieldValidators.password("password"), fieldValidators.register, this.validate];
        this.changePassword = [fieldValidators.oldPassword, fieldValidators.password("new"), this.validate];
        this.refreshToken = [fieldValidators.refreshToken, this.validate];
        this.logout = [fieldValidators.refreshToken, this.validate];
        this.confirmEmail = [fieldValidators.email, fieldValidators.emailCode, this.validate];
        this.resendEmail = [fieldValidators.email, this.validate];
        this.forgotPassword = [fieldValidators.email, this.validate];
        this.resetPassword = [fieldValidators.resetPassword, fieldValidators.password("password"), this.validate];
        this.loginWithGoogle = [fieldValidators.googleTokenId, this.validate];
        this.loginWithFacebook = [fieldValidators.facebookAccessToken, this.validate];
        this.loginWithMfa = [fieldValidators.mfaLoginToken, fieldValidators.oneTimePassword, fieldValidators.userId, this.validate];
        this.enableMfa = [fieldValidators.password("password"), fieldValidators.oneTimePassword, this.validate];
        this.disbleMfa = [fieldValidators.password("password"), fieldValidators.oneTimePassword, this.validate];

        if (jsonConfig.security.reCaptcha.enabled) {
            this.addReCaptchaValidators(jsonConfig);
        }
    }

    private addReCaptchaValidators(jsonConfig: JsonConfig) {
        const recaptchaEnabled = jsonConfig.security.reCaptcha.protectedEndpoints;
        if (recaptchaEnabled.login) {
            this.login.unshift(fieldValidators.recaptcha);
        }
        if (recaptchaEnabled.register) {
            this.register.unshift(fieldValidators.recaptcha);
        }
        if (recaptchaEnabled.confirmEmail) {
            this.confirmEmail.unshift(fieldValidators.recaptcha);
        }
        if (recaptchaEnabled.forgotPassword) {
            this.forgotPassword.unshift(fieldValidators.recaptcha);
        }
        if (recaptchaEnabled.resetPassword) {
            this.resetPassword.unshift(fieldValidators.recaptcha);
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
