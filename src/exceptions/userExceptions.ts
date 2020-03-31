type UserExistsConflictType = "email" | "username" | "phone";

export class UserExistsException extends Error {
    private _conflictType: UserExistsConflictType;

    constructor(conflictType: UserExistsConflictType, message?: string) {
        super(message);
        this._conflictType = conflictType;
        Object.setPrototypeOf(this, UserExistsException.prototype);
    }

    public get conflictType(): UserExistsConflictType {
        return this._conflictType;
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
