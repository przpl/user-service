import { body, oneOf } from "express-validator";
import PasswordValidator from "password-validator";
import { singleton } from "tsyringe";

import { Config } from "../../utils/config/config";
import { AbstractValidator } from "./abstractValidator";
import { FIELD_ERROR_MSG, fieldValidators } from "./fieldValidators";
import { ValidatorArray } from "./validatorArray";

@singleton()
export default class Validator extends AbstractValidator {
    public login: ValidatorArray = [];
    public register: ValidatorArray = [];
    public changePassword: ValidatorArray = [];
    public refreshAccessToken: ValidatorArray = [];
    public logout: ValidatorArray = [];
    public confirmEmail: ValidatorArray = [];
    public resendEmail: ValidatorArray = [];
    public confirmPhone: ValidatorArray = [];
    public resendPhone: ValidatorArray = [];
    public forgotPassword: ValidatorArray = [];
    public resetPassword: ValidatorArray = [];
    public loginWithGoogle: ValidatorArray = [];
    public loginWithFacebook: ValidatorArray = [];
    public loginWithMfa: ValidatorArray = [];
    public enableMfa: ValidatorArray = [];
    public disableMfa: ValidatorArray = [];
    public finishExternalUserRegistration: ValidatorArray = [];

    constructor(config: Config) {
        super();
        const cfg = config.commonFields;
        fieldValidators.email = (isRequired) => {
            const rule = body("email");
            if (!isRequired) {
                rule.optional();
            }
            rule.isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .trim()
                .isLength({ min: 5, max: cfg.email.isLength.max })
                .withMessage(FIELD_ERROR_MSG.isLength)
                .isEmail()
                .withMessage(FIELD_ERROR_MSG.isEmail)
                .normalizeEmail()
                .trim("@"); // if string is empty normalizeEmail() will change it to "@"
            return rule;
        };

        let passwordErrorMsg = `Password should have minimum ${cfg.password.isLength.min} characters`;
        const passwordSchema = new PasswordValidator();
        passwordSchema.is().min(cfg.password.isLength.min);
        passwordSchema.is().max(cfg.password.isLength.max);
        if (cfg.password.hasDigits) {
            passwordSchema.has().digits();
            passwordErrorMsg += ", one digit";
        }
        if (cfg.password.hasSymbols) {
            passwordSchema.has().symbols();
            passwordErrorMsg += ", one symbol";
        }
        if (cfg.password.hasUppercase) {
            passwordSchema.has().uppercase();
            passwordErrorMsg += ", one uppercase";
        }
        if (cfg.password.hasLowercase) {
            passwordSchema.has().lowercase();
            passwordErrorMsg += ", one lowercase";
        }
        fieldValidators.password = (name) =>
            body(name)
                .isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .custom((value) => passwordSchema.validate(value))
                .withMessage(passwordErrorMsg);

        fieldValidators.weakPassword = body("password")
            .isString()
            .withMessage(FIELD_ERROR_MSG.isString)
            .isLength({ min: 1, max: cfg.password.isLength.max })
            .withMessage(FIELD_ERROR_MSG.isLength);

        fieldValidators.oldPassword = body("old")
            .isString()
            .withMessage(FIELD_ERROR_MSG.isString)
            .isLength({ min: 1, max: cfg.password.isLength.max })
            .withMessage(FIELD_ERROR_MSG.isLength);

        fieldValidators.username = (isRequired) => {
            const rule = body("username");
            if (!isRequired) {
                rule.optional();
            }
            rule.isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .trim()
                .isLength({ min: cfg.username.isLength.min, max: cfg.username.isLength.max })
                .withMessage(FIELD_ERROR_MSG.isLength)
                .isAlphanumeric()
                .withMessage(FIELD_ERROR_MSG.isAlphanumeric)
                .customSanitizer((value: string) => value.toLowerCase());
            return rule;
        };

        fieldValidators.phone = (isRequired) => {
            const codeRule = body("phone.code");
            if (!isRequired) {
                codeRule.optional();
            }
            codeRule
                .isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .trim()
                .ltrim("+")
                .isLength({ min: 1, max: 8 })
                .withMessage(FIELD_ERROR_MSG.isLength)
                .matches("^([0-9]|-)+$")
                .withMessage(FIELD_ERROR_MSG.isPhoneCode);

            const numberRule = body("phone.number");
            if (!isRequired) {
                numberRule.optional();
            }
            numberRule
                .isString()
                .withMessage(FIELD_ERROR_MSG.isString)
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage(FIELD_ERROR_MSG.isLength)
                .isMobilePhone("any")
                .withMessage(FIELD_ERROR_MSG.isPhoneNumber);

            return [codeRule, numberRule];
        };

        for (const fieldName of Object.keys(config.additionalFields.registerEndpoint)) {
            const field = config.additionalFields.registerEndpoint[fieldName];
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
            if (field.isISO8601) {
                validation.isISO8601().withMessage(FIELD_ERROR_MSG.isLength);
            }
            if (field.isInt) {
                validation.isInt().withMessage(FIELD_ERROR_MSG.isNumeric);
            }
            if (field.isBoolean) {
                validation.isBoolean().withMessage(FIELD_ERROR_MSG.isBoolean);
            }

            fieldValidators.additionalRegisterField.push(validation);
        }

        this.login = [
            oneOf([fieldValidators.email(true), fieldValidators.username(true), fieldValidators.phone(true)], "Subject is required."),
            fieldValidators.weakPassword,
            this.validate,
        ];
        this.register = [
            fieldValidators.email(config.localLogin.email.required),
            fieldValidators.username(config.localLogin.username.required),
            ...fieldValidators.phone(config.localLogin.phone.required),
            fieldValidators.password("password"),
            ...fieldValidators.additionalRegisterField,
            this.validate,
        ];
        this.changePassword = [fieldValidators.oldPassword, fieldValidators.password("new"), this.validate];
        this.refreshAccessToken = [fieldValidators.sessionCookie, this.validate];
        this.logout = [fieldValidators.sessionCookie, this.validate];
        this.confirmEmail = [fieldValidators.email(true), fieldValidators.confirmationCode, this.validate];
        this.resendEmail = [fieldValidators.email(true), this.validate];
        this.confirmPhone = [...fieldValidators.phone(true), fieldValidators.confirmationCode, this.validate];
        this.resendPhone = [...fieldValidators.phone(true), this.validate];
        this.forgotPassword = [oneOf([fieldValidators.email(true), fieldValidators.phone(true)], "Subject is required."), this.validate];
        this.resetPassword = [fieldValidators.resetPassword, fieldValidators.password("password"), this.validate];
        this.loginWithGoogle = [fieldValidators.googleTokenId, this.validate];
        this.loginWithFacebook = [fieldValidators.facebookAccessToken, this.validate];
        this.loginWithMfa = [fieldValidators.mfaLoginToken, fieldValidators.oneTimePassword, fieldValidators.userId, this.validate];
        this.enableMfa = [fieldValidators.password("password"), fieldValidators.oneTimePassword, this.validate];
        this.disableMfa = [fieldValidators.password("password"), fieldValidators.oneTimePassword, this.validate];

        this.finishExternalUserRegistration = [
            fieldValidators.externalUserRegistrationJwt,
            fieldValidators.username(config.localLogin.username.required),
            ...fieldValidators.phone(config.localLogin.phone.required),
            ...fieldValidators.additionalRegisterField,
            this.validate,
        ];

        if (config.security.reCaptcha.enabled) {
            this.addReCaptchaValidators(config);
        }
    }

    private addReCaptchaValidators(config: Config) {
        const reCaptchaEnabled = config.security.reCaptcha.protectedEndpoints;
        if (reCaptchaEnabled.login) {
            this.login.unshift(fieldValidators.reCaptcha);
        }
        if (reCaptchaEnabled.register) {
            this.register.unshift(fieldValidators.reCaptcha);
        }
        if (reCaptchaEnabled.confirmEmail) {
            this.confirmEmail.unshift(fieldValidators.reCaptcha);
        }
        if (reCaptchaEnabled.forgotPassword) {
            this.forgotPassword.unshift(fieldValidators.reCaptcha);
        }
        if (reCaptchaEnabled.resetPassword) {
            this.resetPassword.unshift(fieldValidators.reCaptcha);
        }
    }
}
