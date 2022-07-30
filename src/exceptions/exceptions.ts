export class ExpiredResetCodeException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ExpiredResetCodeException.prototype);
    }
}

export class ResendCodeLimitException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ResendCodeLimitException.prototype);
    }
}

export class ResendCodeTimeLimitException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ResendCodeTimeLimitException.prototype);
    }
}

export class MfaException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MfaException.prototype);
    }
}
