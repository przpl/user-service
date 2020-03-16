import { FieldConfig } from "./fieldConfig";
import { PasswordFieldConfig } from "./passwordFieldConfig";

export interface JsonConfig {
    redis: {
        host: string;
        port: number;
    };
    security: {
        twoFaToken: {
            enabled: boolean;
            appName: string;
        };
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
                resendEmail: boolean;
            };
        };
    };
    externalLogin: {
        google: {
            enabled: boolean;
            clientId: string;
        };
        facebook: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
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
