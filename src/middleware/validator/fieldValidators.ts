import { body, cookie, param, ValidationChain } from "express-validator";

import {
    CONFIRMATION_CODE_LENGTH,
    MFA_LOGIN_TOKEN_LENGTH,
    ONE_TIME_PASS_LENGTH,
    PASSWORD_RESET_CODE_LENGTH,
    SESSION_COOKIE_NAME,
    SESSION_ID_LENGTH,
    USER_ID_LENGTH,
} from "../../utils/globalConsts";

export const FIELD_ERROR_MSG = {
    isAlphanumeric: "Not alphanumeric",
    isBase64: "Not a Base64 string",
    isEmail: "Not an e-mail",
    isHexadecimal: "Invalid format",
    isISO8601: "Not an ISO date string",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isNumeric: "Not a number",
    isPhoneCode: "Not a phone country code",
    isPhoneNumber: "Not a phone number code",
    isString: "Not a string",
    isUUID: "Invalid format",
    isBoolean: "Not a boolean",
};

export const fieldValidators = {
    userId: body("userId")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: USER_ID_LENGTH, max: USER_ID_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength),
    userIdParam: param("userId")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: USER_ID_LENGTH, max: USER_ID_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength),
    username: null as (isRequired: boolean) => ValidationChain,
    email: null as (isRequired: boolean) => ValidationChain,
    confirmationCode: body("code")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: CONFIRMATION_CODE_LENGTH, max: CONFIRMATION_CODE_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isHexadecimal()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    password: null as (name: "password" | "new") => ValidationChain,
    sessionCookie: (location: "param" | "cookie") =>
        location === "param"
            ? param("sessionId")
            : cookie(SESSION_COOKIE_NAME)
                  .isString()
                  .withMessage(FIELD_ERROR_MSG.isString)
                  .trim()
                  .isLength({ min: SESSION_ID_LENGTH, max: SESSION_ID_LENGTH })
                  .withMessage(FIELD_ERROR_MSG.isLength),
    additionalRegisterField: [] as ValidationChain[],
    weakPassword: {} as ValidationChain,
    oldPassword: {} as ValidationChain,
    resetPassword: body("token")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: PASSWORD_RESET_CODE_LENGTH, max: PASSWORD_RESET_CODE_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isHexadecimal()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    googleTokenId: body("googleTokenId")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isJWT()
        .withMessage(FIELD_ERROR_MSG.isJwt),
    facebookAccessToken: body("facebookAccessToken")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage(FIELD_ERROR_MSG.isLength),
    mfaLoginToken: body("mfaLoginToken")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: MFA_LOGIN_TOKEN_LENGTH, max: MFA_LOGIN_TOKEN_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isHexadecimal()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    oneTimePassword: body("oneTimePassword")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: ONE_TIME_PASS_LENGTH, max: ONE_TIME_PASS_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isNumeric()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    reCaptcha: body("reCaptchaToken")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage(FIELD_ERROR_MSG.isLength),
    externalUserRegistrationJwt: body("token")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage(FIELD_ERROR_MSG.isLength),
    phone: null as (isRequired: boolean) => ValidationChain[],
};
