import { Request, Response } from "express";

import { JwtService } from "../../services/jwtService";
import { SessionManager } from "../../managers/sessionManager";
import { UserAgent } from "../../interfaces/userAgent";
import { RoleManager } from "../../managers/roleManager";

export default abstract class UserController {
    constructor(protected _sessionManager: SessionManager, protected _roleManager: RoleManager, protected _jwtService: JwtService) {}

    protected async sendTokens(req: Request, res: Response, userId: string) {
        const ua: UserAgent = {
            browser: req.userAgent.browser.name,
            os: req.userAgent.os.name,
            osVersion: req.userAgent.os.version,
        };
        const roles = await this._roleManager.getRoles(userId);
        const refreshToken = await this._sessionManager.issueRefreshToken(userId, req.ip, ua);
        const accessToken = this._jwtService.issueAccessToken(refreshToken, userId, roles);

        res.json({ refreshToken: refreshToken, accessToken: accessToken });
    }
}
