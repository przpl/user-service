import { RequestBody } from "./express/requestBody";
import { RequestCookies } from "./express/requestCookies";
import { AccessTokenDto } from "../models/dtos/accessTokenDto";

declare module "express" {
    export interface Request {
        authenticatedUser?: AccessTokenDto;
        body: RequestBody;
        cookies: RequestCookies;
        userAgent?: UAParser.IResult;
    }
}
