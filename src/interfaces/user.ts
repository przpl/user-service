import { TwoFaMethod } from "../dal/entities/userEntity";

export interface User {
    id: string;
    email: string;
    twoFaMethod?: TwoFaMethod;
}
