import { FieldConfig } from "./fieldConfig";

export interface PasswordFieldConfig extends FieldConfig {
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigits: boolean;
    hasSymbols: boolean;
}
