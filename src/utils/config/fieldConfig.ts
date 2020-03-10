export interface FieldConfig {
    isString: boolean;
    trim: boolean;
    isLength: {
        min: number;
        max: number;
    };
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigits: boolean;
    hasSymbols: boolean;
}
