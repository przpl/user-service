import { Request, Response } from "express";

import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { SessionManager } from "../../managers/sessionManager";
import { UserAgent } from "../../interfaces/userAgent";

export default abstract class UserController {
    constructor(private _jwtService: JwtService, private _sessionManager: SessionManager) {}

    protected async sendTokens(req: Request, res: Response, user: User) {
        const ua: UserAgent = {
            browser: req.userAgent.browser.name,
            os: req.userAgent.os.name,
            osVersion: req.userAgent.os.version,
        };
        const refreshToken = await this._sessionManager.issueRefreshToken(user.id, req.ip, ua);
        const accessToken = this._jwtService.issueAccessToken(refreshToken, user.id);

        res.json({ user: this.mapUser(user), refreshToken: refreshToken, accessToken: accessToken });
    }

    protected mapUser(user: User) {
        return {
            id: user.id,
            email: user.email,
        };
    }
}
