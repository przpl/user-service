import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { InvalidJwtTypeException } from "../exceptions/exceptions";
import { JwtService, RefreshToken } from "../services/jwtService";

export default class TokenController {
    constructor(private _jwtService: JwtService) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.body;

        let decoded: RefreshToken;
        try {
            decoded = this._jwtService.decodeRefreshToken(refreshToken);
        } catch (error) {
            if (error?.message.toLowerCase().includes("invalid signature")) {
                return forwardError(next, "invalidJwtSignature", HttpStatus.BAD_REQUEST);
            } else if (error instanceof InvalidJwtTypeException) {
                return forwardError(next, "invalidJwtType", HttpStatus.BAD_REQUEST);
            }
            return forwardInternalError(next, error);
        }

        const accessToken = this._jwtService.issueAccessToken(decoded);
        res.json({ accessToken: accessToken });
    }
}
