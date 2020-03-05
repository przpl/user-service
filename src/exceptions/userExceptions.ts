export class UserExistsException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserExistsException.prototype);
    }
}
