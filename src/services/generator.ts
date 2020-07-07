import cryptoRandomString from "crypto-random-string";

import {
    USER_ID_LENGTH,
    CONFIRMATION_CODE_LENGTH,
    PASSWORD_RESET_CODE_LENGTH,
    MFA_LOGIN_TOKEN_LENGTH,
    REFRESH_TOKEN_LENGTH,
} from "../utils/globalConsts";
import { base64ToHttpFriendly } from "../utils/base64";

export function generateUserId(): string {
    return base64ToHttpFriendly(cryptoRandomString({ length: USER_ID_LENGTH, type: "base64" }));
}

export function generateConfirmationCode(): string {
    return cryptoRandomString({ length: CONFIRMATION_CODE_LENGTH, type: "numeric" });
}

export function generatePasswordResetCode(): string {
    return cryptoRandomString({ length: PASSWORD_RESET_CODE_LENGTH, type: "hex" }).toUpperCase();
}

export function generateMfaLoginToken(): string {
    return cryptoRandomString({ length: MFA_LOGIN_TOKEN_LENGTH, type: "hex" });
}

export function generateRefreshToken(): string {
    return base64ToHttpFriendly(cryptoRandomString({ length: REFRESH_TOKEN_LENGTH, type: "base64" }));
}
