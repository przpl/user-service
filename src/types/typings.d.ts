import { RequestBody } from "./express/requestBody";
import { RequestCookies } from "./express/requestCookies";
import { AuthenticatedUser } from "../models/authenticatedUser";

declare module "express" {
    export interface Request {
        authenticatedUser?: AuthenticatedUser;
        body: RequestBody;
        cookies: RequestCookies;
        userAgent?: UAParser.IResult;
        sessionId?: string;
    }
}
