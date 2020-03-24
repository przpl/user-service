import { AccessToken } from "../services/jwtService";
import { RequestBody } from "./express/requestBody";
import { RequestCookies } from "./express/requestCookies";

declare module "express" {
    export interface Request {
        authenticatedUser?: AccessToken;
        body: RequestBody;
        cookies: RequestCookies;
        userAgent?: IUAParser.IResult;
    }
}
