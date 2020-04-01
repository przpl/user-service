import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { JwtService } from "../services/jwtService";
import { SessionManager } from "../managers/sessionManager";
import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import { RoleManager } from "../managers/roleManager";
import { Session } from "../models/session";

@singleton()
export default class TokenController {
    constructor(private _roleManager: RoleManager, private _sessionManager: SessionManager, private _jwtService: JwtService) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;

        let session: Session;
        try {
            session = await this._sessionManager.refreshSessionAndGetUserId(refreshToken, req.ip);
        } catch (error) {
            if (error instanceof StaleRefreshTokenException) {
                return forwardError(next, "staleRefreshToken", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        if (!session) {
            return forwardError(next, "sessionDoesNotExist", HttpStatus.UNAUTHORIZED);
        }

        const roles = await this._roleManager.getRoles(session.userId);
        const accessToken = this._jwtService.issueAccessToken(refreshToken, session.userId, roles);

        res.json({ accessToken: accessToken });
    }
}
