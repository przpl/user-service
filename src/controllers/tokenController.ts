import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { JwtService } from "../services/jwtService";
import { SessionManager } from "../managers/sessionManager";
import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";

export default class TokenController {
    constructor(private _jwtService: JwtService, private _sessionManager: SessionManager) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.body;

        let userId: string;
        try {
            userId = await this._sessionManager.refreshSessionAndGetUserId(refreshToken);
        } catch (error) {
            if (error instanceof StaleRefreshTokenException) {
                return forwardError(next, "staleRefreshToken", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        if (!userId) {
            return forwardError(next, "sessionDoesNotExist", HttpStatus.UNAUTHORIZED);
        }

        const accessToken = this._jwtService.issueAccessToken(userId);
        res.json({ accessToken: accessToken });
    }
}
