import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { JwtService } from "../services/jwtService";
import { SessionManager } from "../managers/sessionManager";
import { forwardError } from "../utils/expressUtils";

export default class TokenController {
    constructor(private _jwtService: JwtService, private _sessionManager: SessionManager) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.body;

        const userId = await this._sessionManager.getUserIdFromRefreshToken(refreshToken);
        if (!userId) {
            return forwardError(next, "sessionNotExist", HttpStatus.UNAUTHORIZED);
        }

        const accessToken = this._jwtService.issueAccessToken(userId);
        res.json({ accessToken: accessToken });
    }
}
