import { AccessToken } from "../services/jwtService";
import { RequestBody } from "../interfaces/requestBody";

declare module "express" {
    export interface Request {
        authenticatedUser?: AccessToken;
        body: RequestBody;
    }
}
