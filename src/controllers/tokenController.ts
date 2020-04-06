import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { JwtService } from "../services/jwtService";
import { SessionManager } from "../managers/sessionManager";
import { forwardInternalError } from "../utils/expressUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import { RoleManager } from "../managers/roleManager";
import { Session } from "../models/session";
import * as errors from "./commonErrors";

@singleton()
export default class TokenController {
    constructor(private _roleManager: RoleManager, private _sessionManager: SessionManager, private _jwtService: JwtService) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;

        let session: Session;
        try {
            session = await this._sessionManager.refreshSession(refreshToken, req.ip);
        } catch (error) {
            if (error instanceof StaleRefreshTokenException) {
                return errors.staleRefreshToken(next);
            }
            return forwardInternalError(next, error);
        }

        if (!session) {
            return errors.sessionDoesNotExist(next);
        }

        const roles = await this._roleManager.getRoles(session.userId);
        const accessToken = this._jwtService.issueAccessToken(refreshToken, session.userId, roles);

        res.json({ accessToken: accessToken });
    }
}
