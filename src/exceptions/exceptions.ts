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
