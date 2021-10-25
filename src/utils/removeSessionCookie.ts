import { CookieOptions, Response } from "express";
import { container } from "tsyringe";

import { Config } from "./config/config";
import { SESSION_COOKIE_NAME, SESSION_STATE_COOKIE_NAME, XSRF_TOKEN_COOKIE_NAME } from "./globalConsts";

export function removeSessionCookie(res: Response) {
    const config = container.resolve(Config);

    const cookieOptions: CookieOptions = {
        sameSite: config.session.cookie.sameSite,
        secure: config.session.cookie.secure,
        domain: config.session.cookie.domain,
    };
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    res.clearCookie(SESSION_STATE_COOKIE_NAME, cookieOptions);
    res.clearCookie(XSRF_TOKEN_COOKIE_NAME, cookieOptions);
}
