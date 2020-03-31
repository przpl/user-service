export class ExpiredResetCodeException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ExpiredResetCodeException.prototype);
    }
}

export class StaleRefreshTokenException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, StaleRefreshTokenException.prototype);
    }
}

export class EmailResendCodeLimitException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, EmailResendCodeLimitException.prototype);
    }
}

export class EmailResendCodeTimeLimitException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, EmailResendCodeTimeLimitException.prototype);
    }
}

export class MfaException extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MfaException.prototype);
    }
}