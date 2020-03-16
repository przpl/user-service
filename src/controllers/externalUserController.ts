import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { UserManager } from "../managers/userManger";
import { User } from "../interfaces/user";
import { JwtService } from "../services/jwtService";
import { ExternalUser } from "../middleware/passport";
import { ExternalLoginProvider } from "../dal/entities/externalLogin";

export default class ExternalUserController {
    constructor(private _userManager: UserManager, private _jwtService: JwtService) {}

    public async loginWithExternalProvider(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;

        let user: User;
        try {
            user = await this._userManager.loginOrRegisterExternalUser(externalUser.id, provider);
        } catch (error) {
            return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        // TODO notify other services about new user, send data to queue

        this.sendTokens(res, user);
    }

    private sendTokens(res: Response, user: User) {
        const refreshToken = this._jwtService.issueRefreshToken(user.id);
        const decoded = this._jwtService.decodeRefreshToken(refreshToken);
        const accessToken = this._jwtService.issueAccessToken(decoded);

        const userProjection = {
            id: user.id,
            email: user.email,
        };

        res.json({ user: userProjection, refreshToken: refreshToken, accessToken: accessToken });
    }
}
