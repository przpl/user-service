import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { JwtService } from "../services/jwtService";
import { SessionManager } from "../managers/sessionManager";
import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import { RoleManager } from "../managers/roleManager";

export default class TokenController {
    constructor(private _roleManager: RoleManager, private _sessionManager: SessionManager, private _jwtService: JwtService) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;

        let userId: string;
        try {
            userId = await this._sessionManager.refreshSessionAndGetUserId(refreshToken, req.ip);
        } catch (error) {
            if (error instanceof StaleRefreshTokenException) {
                return forwardError(next, "staleRefreshToken", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        if (!userId) {
            return forwardError(next, "sessionDoesNotExist", HttpStatus.UNAUTHORIZED);
        }

        const roles = await this._roleManager.getRoles(userId);
        const accessToken = this._jwtService.issueAccessToken(refreshToken, userId, roles);

        res.json({ accessToken: accessToken });
    }
}
