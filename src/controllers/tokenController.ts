import { NextFunction, Request, Response } from "express";
import { inject, singleton } from "tsyringe";

import { RoleManager } from "../managers/roleManager";
import { BaseSessionManager } from "../managers/session/baseSessionManager";
import { Session } from "../models/session";
import { JwtService } from "../services/jwtService";
import { forwardInternalError } from "../utils/expressUtils";
import { SESSION_COOKIE_NAME } from "../utils/globalConsts";
import * as errors from "./commonErrors";

@singleton()
export default class TokenController {
    constructor(
        private _roleManager: RoleManager,
        @inject(BaseSessionManager.name) private _sessionManager: BaseSessionManager,
        private _jwtService: JwtService
    ) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const sessionCookie = req.cookies[SESSION_COOKIE_NAME];

        let session: Session;
        try {
            session = await this._sessionManager.refreshJwt(sessionCookie, req.ip);
        } catch (error) {
            return forwardInternalError(next, error);
        }

        if (!session) {
            res.clearCookie(SESSION_COOKIE_NAME);
            return errors.sessionDoesNotExist(next);
        }

        const roles = await this._roleManager.getRoles(session.userId);
        const accessToken = this._jwtService.issueAccessToken(sessionCookie, session.userId, roles);

        res.json({ accessToken });
    }
}
