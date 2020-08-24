import { NextFunction as NF } from "express";
import { StatusCodes } from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { dtoFromPhoneModel } from "../models/mappers";
import { Phone } from "../models/phone";

// #region Local Login
export const invalidCredentials = (next: NF) => forwardError(next, "invalidCredentials", StatusCodes.UNAUTHORIZED);

export function emailNotConfirmed(next: NF, email: string) {
    const errors: ErrorResponse = {
        id: "emailNotConfirmed",
        data: { user: { email: email } }, // user can login with a username or a phone number, client app may need reference
    };
    forwardError(next, errors, StatusCodes.FORBIDDEN);
}

export function phoneNotConfirmed(next: NF, phone: Phone) {
    const errors: ErrorResponse = {
        id: "phoneNotConfirmed",
        data: { user: { phone: dtoFromPhoneModel(phone) } }, // user can login with a username or a email, client app may need reference
    };
    forwardError(next, errors, StatusCodes.FORBIDDEN);
}

export const userAlreadyExists = (next: NF) => forwardError(next, "userAlreadyExists", StatusCodes.BAD_REQUEST);

export const usernameTaken = (next: NF) => forwardError(next, "usernameTaken", StatusCodes.BAD_REQUEST);

export const notLocalUser = (next: NF) => forwardError(next, "notLocalUser", StatusCodes.FORBIDDEN);

export const invalidPassword = (next: NF) => forwardError(next, "invalidPassword", StatusCodes.FORBIDDEN);

export const passwordCodeExpired = (next: NF) => forwardError(next, "codeExpired", StatusCodes.BAD_REQUEST);
// #endregion

// #region Multi factor authentication
export const invalidMfaToken = (next: NF) => forwardError(next, "invalidMfaToken", StatusCodes.UNAUTHORIZED);

export const invalidOneTimePassword = (next: NF) => forwardError(next, "invalidOneTimePassword", StatusCodes.UNAUTHORIZED);

export const mfaLimitExceeded = (next: NF) => forwardError(next, "mfaLimitExceeded", StatusCodes.UNAUTHORIZED);

export const mfaAlreadyActivated = (next: NF) => forwardError(next, "mfaAlreadyActivated", StatusCodes.FORBIDDEN);
// #endregion

// #region Session
export const staleRefreshToken = (next: NF) => forwardError(next, "staleRefreshToken", StatusCodes.FORBIDDEN);

export const sessionDoesNotExist = (next: NF) => forwardError(next, "sessionDoesNotExist", StatusCodes.UNAUTHORIZED);
// #endregion

// #region User
export function userLockedOut(next: NF, reason: string) {
    const errors: ErrorResponse = {
        id: "userLockedOut",
        data: { reason: reason },
    };
    forwardError(next, errors, StatusCodes.FORBIDDEN);
}

export const userNotExists = (next: NF) => forwardError(next, "userNotExists", StatusCodes.NOT_FOUND);
// #endregion

export const limitExceeded = (next: NF) => forwardError(next, "limitExceeded", StatusCodes.BAD_REQUEST);

export const invalidToken = (next: NF) => forwardError(next, "invalidToken", StatusCodes.FORBIDDEN);
