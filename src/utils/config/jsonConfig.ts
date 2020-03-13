import { FieldConfig } from "./fieldConfig";
import { PasswordFieldConfig } from "./passwordFieldConfig";

export interface JsonConfig {
    security: {
        bcryptRounds: number;
        reCaptcha: {
            enabled: boolean;
            ssl: boolean;
            protectedEndpoints: {
                register: boolean;
                login: boolean;
                forgotPassword: boolean;
                resetPassword: boolean;
                confirmEmail: boolean;
            };
        };
    };
    externalLogin: {
        google: {
            enabled: boolean;
            clientId: string;
        };
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
