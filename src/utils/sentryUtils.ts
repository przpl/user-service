import * as Sentry from "@sentry/node";

import { AuthenticatedUser } from "../models/authenticatedUser";

export function captureExceptionWithSentry(error: any, user?: AuthenticatedUser, printErrOnConsole = false) {
    Sentry.captureException(error, { user: { id: user?.sub } });
    if (printErrOnConsole && process.env.NODE_ENV === "development" && error.stack) {
        console.log(error.stack);
    }
}
