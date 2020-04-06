import { NextFunction as NF } from "express";
import Status from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { dtoFromPhoneModel } from "../models/mappers";
import { Phone } from "../models/phone";

// #region Local Login
export const invalidCredentials = (next: NF) => forwardError(next, "invalidCredentials", Status.UNAUTHORIZED);

export function emailNotConfirmed(next: NF, email: string) {
    const errors: ErrorResponse = {
        id: "emailNotConfirmed",
        data: { user: { email: email } }, // user can login with a username or a phone number, client app may need reference
    };
    forwardError(next, errors, Status.FORBIDDEN);
}

export function phoneNotConfirmed(next: NF, phone: Phone) {
    const errors: ErrorResponse = {
        id: "phoneNotConfirmed",
        data: { user: { phone: dtoFromPhoneModel(phone) } }, // user can login with a username or a email, client app may need reference
    };
    forwardError(next, errors, Status.FORBIDDEN);
}

export const userAlreadyExists = (next: NF) => forwardError(next, "userAlreadyExists", Status.BAD_REQUEST);

export const usernameAlreadyUsed = (next: NF) => forwardError(next, "usernameAlreadyUsed", Status.BAD_REQUEST);

export const notLocalUser = (next: NF) => forwardError(next, "notLocalUser", Status.FORBIDDEN);

export const invalidPassword = (next: NF) => forwardError(next, "invalidPassword", Status.FORBIDDEN);

export const passwordCodeExpired = (next: NF) => forwardError(next, "codeExpired", Status.BAD_REQUEST);
// #endregion

// #region Multi factor authentication
export const invalidMfaToken = (next: NF) => forwardError(next, "invalidMfaToken", Status.UNAUTHORIZED);

export const invalidOneTimePassword = (next: NF) => forwardError(next, "invalidOneTimePassword", Status.UNAUTHORIZED);

export const mfaAlreadyActivated = (next: NF) => forwardError(next, "mfaAlreadyActivated", Status.FORBIDDEN);
// #endregion

// #region Session
export const staleRefreshToken = (next: NF) => forwardError(next, "staleRefreshToken", Status.FORBIDDEN);

export const sessionDoesNotExist = (next: NF) => forwardError(next, "sessionDoesNotExist", Status.UNAUTHORIZED);
// #endregion

// #region User
export function userLockedOut(next: NF, reason: string) {
    const errors: ErrorResponse = {
        id: "userLockedOut",
        data: { reason: reason },
    };
    forwardError(next, errors, Status.FORBIDDEN);
}

export const userNotExists = (next: NF) => forwardError(next, "userNotExists", Status.BAD_REQUEST);
// #endregion

export const limitExceeded = (next: NF) => forwardError(next, "limitExceeded", Status.BAD_REQUEST);

export const invalidToken = (next: NF) => forwardError(next, "invalidToken", Status.FORBIDDEN);
