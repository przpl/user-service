import { FieldConfig } from "./fieldConfig";
import { PasswordFieldConfig } from "./passwordFieldConfig";

export interface JsonConfig {
    security: {
        bcryptRounds: number;
    };
    passwordReset: {
        codeExpirationTimeInMinutes: number;
    };
    commonFields: {
        email: FieldConfig;
        password: PasswordFieldConfig;
        refreshToken: FieldConfig;
    };
    additionalFields: {
        registerEndpoint: {
            [key: string]: FieldConfig;
        };
    };
}
