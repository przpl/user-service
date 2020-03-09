import { Request } from "express";

import { AccessToken } from "./src/services/jwtService";

declare namespace Express {
    export interface Request {
        user?: AccessToken;
    }
}
