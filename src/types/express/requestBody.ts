import { Phone } from "../../models/phone";

export interface RequestBody {
    // Change password
    new?: string;
    old?: string;

    // Login
    mfaLoginToken?: string;
    oneTimePassword?: string;

    // Login with external provider
    googleTokenId?: string;
    facebookAccessToken?: string;
    id_token?: string; // eslint-disable-line camelcase
    access_token?: string; // eslint-disable-line camelcase

    // ReCaptcha
    recaptchaKey?: string;

    // Common
    username?: string;
    phone?: Phone;
    token?: string;
    userId?: string;
    code?: string;
    email?: string;
    password?: string;
    userRole?: string;
    lockUntil?: string;
    lockReason?: string;
}
