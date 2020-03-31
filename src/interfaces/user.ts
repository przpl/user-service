import { MfaMethod } from "../dal/entities/mfaEntity";

export interface User {
    id: string;
    email: string;
    mfaMethod: MfaMethod;
    isLocalAccount: boolean;
}
