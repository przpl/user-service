export class InvalidJwtTypeException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, InvalidJwtTypeException.prototype);
    }
}
