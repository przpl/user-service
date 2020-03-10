export interface ConfigValidationResult {
    variableName: string;
    message: string;
    severity: "warning" | "error";
}
