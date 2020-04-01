export class NotFoundException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, NotFoundException.prototype);
    }
}

export class UserNotLocalException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserNotLocalException.prototype);
    }
}

export class InvalidPasswordException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, InvalidPasswordException.prototype);
    }
}
