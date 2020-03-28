export interface RequestBody {
    // Change password
    new?: string;
    old?: string;

    // Common
    token?: string;
    userId?: string;
    code?: string;
    googleTokenId?: string;
    facebookAccessToken?: string;
    mfaLoginToken?: string;
    oneTimePassword?: string;
    recaptchaKey?: string;
    email?: string;
    password?: string;
    id_token?: string; // eslint-disable-line camelcase
    access_token?: string; // eslint-disable-line camelcase
    userRole?: string;
    lockUntil?: string;
    lockReason?: string;
}
