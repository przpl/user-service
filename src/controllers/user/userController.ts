import { Response } from "express";

import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { SessionManager } from "../../managers/sessionManager";

export default abstract class UserController {
    constructor(private _jwtService: JwtService, private _sessionManager: SessionManager) {}

    protected async sendTokens(res: Response, user: User) {
        const refreshToken = await this._sessionManager.issueRefreshToken(user.id);
        const accessToken = this._jwtService.issueAccessToken(user.id);

        res.json({ user: this.mapUser(user), refreshToken: refreshToken, accessToken: accessToken });
    }

    protected mapUser(user: User) {
        return {
            id: user.id,
            email: user.email,
        };
    }
}
