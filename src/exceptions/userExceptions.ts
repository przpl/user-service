export class UserExistsException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserExistsException.prototype);
    }
}

export class UserNotExistsException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserNotExistsException.prototype);
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

export class UserNotConfirmedException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserNotConfirmedException.prototype);
    }
}

export class UserLockedOutException extends Error {
    constructor(private _lockReason: string, message?: string) {
        super(message);
        Object.setPrototypeOf(this, UserLockedOutException.prototype);
    }

    public get reason(): string {
        return this._lockReason;
    }
}
