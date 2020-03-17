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
    isUUID: "Invalid format",
};

// TODO global const
const USER_ID_LENGTH = 36;
const HMAC_256_SIG_LENGTH = 64;
const PASSWORD_RESET_CODE_LENGTH = 10;
const TWO_FA_TOKEN_LENGHT = 64;
const ONE_TIME_PASS_LENGHT = 6;

type ValidatorArray = (ValidationChain | ((req: Request, res: Response<any>, next: NextFunction) => void))[];

export default class Validator {
    // TODO arrays not needed?
    // #region Validation chains
    private _userId: ValidationChain[] = [
        body("userId")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: USER_ID_LENGTH, max: USER_ID_LENGTH })
            .withMessage(ERROR_MSG.isLength)
            .isUUID()
            .withMessage(ERROR_MSG.isUUID),
    ];
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
    private _oldPassword: ValidationChain[] = [];
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
    private _googleTokenId: ValidationChain[] = [
        body("tokenId")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: 1, max: 2000 })
            .withMessage(ERROR_MSG.isLength)
            .isJWT()
            .withMessage(ERROR_MSG.isJwt),
    ];
    private _facebookAccessToken: ValidationChain[] = [
        body("accessToken")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage(ERROR_MSG.isLength),
    ];
    private _mfaLoginToken: ValidationChain[] = [
        body("mfaLoginToken")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: TWO_FA_TOKEN_LENGHT, max: TWO_FA_TOKEN_LENGHT })
            .withMessage(ERROR_MSG.isLength)
            .isHexadecimal()
            .withMessage(ERROR_MSG.isHexadecimal),
    ];
    private _oneTimePassword: ValidationChain[] = [
        body("oneTimePassword")
            .isString()
            .withMessage(ERROR_MSG.isString)
            .trim()
            .isLength({ min: ONE_TIME_PASS_LENGHT, max: ONE_TIME_PASS_LENGHT })
            .withMessage(ERROR_MSG.isLength)
            .isNumeric()
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
    public resendEmail: ValidatorArray = [];
    public forgotPassword: ValidatorArray = [];
    public resetPassword: ValidatorArray = [];
    public loginWithGoogle: ValidatorArray = [];
    public loginWithFacebook: ValidatorArray = [];
    public loginWithMfa: ValidatorArray = [];
    public enableMfa: ValidatorArray = [];
    public disbleMfa: ValidatorArray = [];
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

        this._oldPassword.push(
            body("oldPassword")
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
        this.changePassword = [...this._oldPassword, ...this._password, this.validate];
        this.refreshToken = [...this._refreshToken, this.validate];
        this.confirmEmail = [...this._email, ...this._emailSignature, this.validate];
        this.resendEmail = [...this._email, this.validate];
        this.forgotPassword = [...this._email, this.validate];
        this.resetPassword = [...this._resetPassword, ...this._password, this.validate];
        this.loginWithGoogle = [...this._googleTokenId, this.validate];
        this.loginWithFacebook = [...this._facebookAccessToken, this.validate];
        this.loginWithMfa = [...this._mfaLoginToken, ...this._oneTimePassword, ...this._userId, this.validate];
        this.enableMfa = [...this._password, ...this._oneTimePassword, this.validate];
        this.disbleMfa = [...this._password, ...this._oneTimePassword, this.validate];

        if (jsonConfig.security.reCaptcha.enabled) {
            this.addReCaptchaValidators(jsonConfig);
        }
    }

    private addReCaptchaValidators(jsonConfig: JsonConfig) {
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
