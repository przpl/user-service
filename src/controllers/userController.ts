import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { UserManager } from "../managers/userManger";
import { UserExistsException } from "../exceptions/userExceptions";

export default class UserController {
    private _userManager = new UserManager();

    public async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;

        try {
            await this._userManager.register(email, password);
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

        res.send();
    }
}
