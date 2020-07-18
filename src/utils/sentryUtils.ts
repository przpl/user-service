import * as Sentry from "@sentry/node";

import { AccessTokenDto } from "../models/dtos/accessTokenDto";

export function captureExceptionWithSentry(error: any, user?: AccessTokenDto, printErrOnConsole = false) {
    Sentry.captureException(error, { user: { id: user?.sub } });
    if (printErrOnConsole && process.env.NODE_ENV === "development" && error.stack) {
        console.log(error.stack);
    }
}
