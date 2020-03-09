import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { UserManager } from "../managers/userManger";
import { UserExistsException, UserNotConfirmedException, UserNotExistsException, InvalidPasswordException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { InvalidJwtTypeException } from "../exceptions/exceptions";
import { JwtService, RefreshToken } from "../services/jwtService";

export default class UserController {
    constructor(private _userManager: UserManager, private _jwtService: JwtService) {}

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
        // const emailSig = this._userManager.getEmailSignature(user.email);

        this.sendTokens(res, user);
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        let user: User;
        try {
            user = await this._userManager.login(email, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.UNAUTHORIZED;
            if (error instanceof UserNotExistsException || error instanceof InvalidPasswordException) {
                errors.push({ id: "invalidCredentials" });
            } else if (error instanceof UserNotConfirmedException) {
                errors.push({ id: "emailNotConfirmed" });
                responseCode = HttpStatus.FORBIDDEN;
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode);
        }

        this.sendTokens(res, user);
    }

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.body;

        let decoded: RefreshToken;
        try {
            decoded = this._jwtService.decodeRefreshToken(refreshToken);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            if (error?.message.toLowerCase().includes("invalid signature")) {
                errors.push({ id: "invalidJwtSignature" });
            } else if (error instanceof InvalidJwtTypeException) {
                errors.push({ id: "invalidJwtType" });
            }
            return forwardError(next, errors, HttpStatus.BAD_REQUEST);
        }

        const accessToken = this._jwtService.issueAccessToken(decoded);
        res.json({ accessToken: accessToken });
    }

    // ? JWT should not be issued because broken email confirmation will enable attacker to issue tokens
    public async confirmEmail(req: Request, res: Response, next: NextFunction) {
        const { email, signature } = req.body;
        const result = this._userManager.verifyEmailSignature(email, signature);
        if (!result) {
            return res.json({ result: false });
        }
        try {
            await this._userManager.updateEmailConfirmed(email, result);
        } catch (error) {
            return res.json({ result: false });
        }

        res.json({ result: result });
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
