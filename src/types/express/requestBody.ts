export interface RequestBody {
    // Change password
    new?: string;
    old?: string;

    // Login
    subject?: string;
    mfaLoginToken?: string;
    oneTimePassword?: string;

    // Login with external provider
    googleTokenId?: string;
    facebookAccessToken?: string;
    id_token?: string; // eslint-disable-line camelcase
    access_token?: string; // eslint-disable-line camelcase

    // Register
    username?: string;

    // ReCaptcha
    recaptchaKey?: string;

    // Common
    token?: string;
    userId?: string;
    code?: string;
    email?: string;
    password?: string;
    userRole?: string;
    lockUntil?: string;
    lockReason?: string;
}
