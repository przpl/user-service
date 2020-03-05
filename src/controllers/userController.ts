import { Request, Response, NextFunction } from "express";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

export default class UserController {
    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            // foo.bar();
        } catch (error) {
            const errorsList: ErrorResponse[] = [
                {
                    id: "unknown",
                    message: "Unknown error. Please try again.",
                },
            ];
            return forwardError(next, errorsList);
        }

        res.send();
    }
}
