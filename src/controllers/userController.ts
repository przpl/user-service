import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { UserManager } from "../managers/userManger";
import { UserExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";

export default class UserController {
    constructor(private _userManager: UserManager) {}

    public async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;

        let user: User;
        try {
            user = await this._userManager.register(email, password);
        } catch (error) {
            const errorsList: ErrorResponse[] = [];
            let responseCode = 500;
            if (error instanceof UserExistsException) {
                errorsList.push({
                    id: "userAlreadyExists",
                    message: `User with e-mail ${email} already exists.`,
                });
                responseCode = HttpStatus.BAD_REQUEST;
            }

            return forwardError(next, errorsList, responseCode);
        }

        // TODO notify other services about new user, send data to queue

        const refreshToken = this._userManager.issueRefreshToken(user.id);
        const decoded = this._userManager.decodeRefreshToken(refreshToken);
        const accessToken = this._userManager.issueAccessToken(decoded);

        res.json({ user: user, refreshToken: refreshToken, accessToken: accessToken });
    }

    public async login(req: Request, res: Response, next: NextFunction) {}

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {}
}
