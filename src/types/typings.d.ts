import { AccessToken } from "../services/jwtService";

declare module "express" {
    export interface Request {
        authenticatedUser?: AccessToken;
    }
}
