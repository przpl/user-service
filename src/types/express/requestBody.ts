export interface RequestBody {
    userId?: string;
    emailCode?: string;
    resetCode?: string;
    googleTokenId?: string;
    facebookAccessToken?: string;
    mfaLoginToken?: string;
    oneTimePassword?: string;
    recaptchaKey?: string;
    email?: string;
    password?: string;
    oldPassword?: string;
    id_token?: string; // eslint-disable-line camelcase
    access_token?: string; // eslint-disable-line camelcase
    userRole?: string;
}
