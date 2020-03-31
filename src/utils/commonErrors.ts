export function throwCtorError(): never {
    throw new Error("Cannot create instance. Invalid argument(s).");
}

export function throwCtorArgError(argName: string): never {
    throw new Error(`Cannot create instance. Argument ${argName} is invalid.`);
}
