import { SESSION_COOKIE_NAME } from "../../utils/globalConsts";

export interface RequestCookies {
    [SESSION_COOKIE_NAME]?: string;
}
