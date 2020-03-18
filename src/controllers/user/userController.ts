import { Response } from "express";

import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";

export default abstract class UserController {
    constructor(private _jwtService: JwtService) {}

    protected sendTokens(res: Response, user: User) {
        const refreshToken = this._jwtService.issueRefreshToken(user.id);
        const decoded = this._jwtService.decodeRefreshToken(refreshToken);
        const accessToken = this._jwtService.issueAccessToken(decoded);

        res.json({ user: this.mapUser(user), refreshToken: refreshToken, accessToken: accessToken });
    }

    protected mapUser(user: User) {
        return {
            id: user.id,
            email: user.email,
        };
    }
}
