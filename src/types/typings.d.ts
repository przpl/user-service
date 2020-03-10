import { AccessToken } from "../services/jwtService";

declare module "express" {
    export interface Request {
        user?: AccessToken;
    }
}
