import * as Sentry from "@sentry/node";

import { AccessTokenDto } from "../models/dtos/accessTokenDto";

export function captureExceptionWithSentry(error: any, user?: AccessTokenDto) {
    Sentry.captureException(error, { user: { id: user?.sub } });
}
