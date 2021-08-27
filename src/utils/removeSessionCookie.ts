import { Response } from "express";
import { container } from "tsyringe";

import { Config } from "./config/config";
import { SESSION_COOKIE_NAME, SESSION_STATE_COOKIE_NAME } from "./globalConsts";

export function removeSessionCookie(res: Response) {
    const config = container.resolve(Config);

    res.clearCookie(SESSION_COOKIE_NAME, {
        sameSite: config.session.cookie.sameSite,
        secure: config.session.cookie.secure,
    });
    res.clearCookie(SESSION_STATE_COOKIE_NAME, {
        sameSite: config.session.cookie.sameSite,
        secure: config.session.cookie.secure,
    });
}