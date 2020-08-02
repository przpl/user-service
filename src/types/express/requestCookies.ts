import { REFRESH_TOKEN_COOKIE_NAME } from "../../utils/globalConsts";

export interface RequestCookies {
    [REFRESH_TOKEN_COOKIE_NAME]?: string;
}
