import cryptoRandomString from "crypto-random-string";

import { base64ToHttpFriendly } from "../utils/base64";
import {
    CONFIRMATION_CODE_LENGTH,
    MFA_LOGIN_TOKEN_LENGTH,
    PASSWORD_RESET_CODE_LENGTH,
    SESSION_ID_LENGTH,
    USER_ID_LENGTH,
} from "../utils/globalConsts";

export function generateUserId(): string {
    return base64ToHttpFriendly(cryptoRandomString({ length: USER_ID_LENGTH, type: "base64" }));
}

export function generateConfirmationCode(): string {
    return cryptoRandomString({ length: CONFIRMATION_CODE_LENGTH, type: "hex" }).toUpperCase();
}

export function generatePasswordResetCode(): string {
    return cryptoRandomString({ length: PASSWORD_RESET_CODE_LENGTH, type: "hex" }).toUpperCase();
}

export function generateMfaLoginToken(): string {
    return cryptoRandomString({ length: MFA_LOGIN_TOKEN_LENGTH, type: "hex" });
}

export function generateSessionId(): string {
    return base64ToHttpFriendly(cryptoRandomString({ length: SESSION_ID_LENGTH, type: "base64" }));
}
