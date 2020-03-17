export interface RequestBody {
    userId?: string;
    signature?: string;
    code?: string;
    tokenId?: string;
    accessToken?: string;
    mfaLoginToken?: string;
    oneTimePassword?: string;
    recaptchaKey?: string;
    email?: string;
    password?: string;
    refreshToken?: string;
    oldPassword?: string;
}
