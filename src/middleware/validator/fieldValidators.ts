import { ValidationChain, body } from "express-validator";

import { USER_ID_LENGTH, PASSWORD_RESET_CODE_LENGTH, TWO_FA_TOKEN_LENGHT, ONE_TIME_PASS_LENGHT, EMAIL_SIG_LENGTH } from "../../utils/globalConsts";

export const FIELD_ERROR_MSG = {
    isBase64: "Not a Base64 string",
    isEmail: "Not an e-mail",
    isHexadecimal: "Invalid format",
    isJwt: "Not a JWT",
    isLength: "Length exceeded",
    isString: "Not a string",
    isUUID: "Invalid format",
};

export const fieldValidators = {
    userId: body("userId")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: USER_ID_LENGTH, max: USER_ID_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isUUID()
        .withMessage(FIELD_ERROR_MSG.isUUID),
    email: {} as ValidationChain,
    emailSignature: body("emailSig")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: EMAIL_SIG_LENGTH, max: EMAIL_SIG_LENGTH })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isHexadecimal()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    password: {} as ValidationChain,
    refreshToken: body("refreshToken")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 88, max: 88 })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isBase64()
        .withMessage(FIELD_ERROR_MSG.isBase64),
    register: {} as ValidationChain,
    weakPassword: {} as ValidationChain,
    oldPassword: {} as ValidationChain,
    resetPassword: body("resetCode")
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
        .isLength({ min: TWO_FA_TOKEN_LENGHT, max: TWO_FA_TOKEN_LENGHT })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isHexadecimal()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    oneTimePassword: body("oneTimePassword")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: ONE_TIME_PASS_LENGHT, max: ONE_TIME_PASS_LENGHT })
        .withMessage(FIELD_ERROR_MSG.isLength)
        .isNumeric()
        .withMessage(FIELD_ERROR_MSG.isHexadecimal),
    recaptcha: body("recaptchaKey")
        .isString()
        .withMessage(FIELD_ERROR_MSG.isString)
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage(FIELD_ERROR_MSG.isLength),
};
