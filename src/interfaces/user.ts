import { MfaMethod } from "../dal/entities/userEntity";

export interface User {
    id: string;
    email: string;
    mfaMethod: MfaMethod;
    isLocalAccount: boolean;
}
