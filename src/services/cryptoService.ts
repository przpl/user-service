import crypto from "crypto";
import bcrypt from "bcrypt";
import { isNullOrUndefined } from "util";

const CHARS_PER_BYTE = 2;

export class CryptoService {
    constructor(private _bcryptRounds: number) {
        if (this._bcryptRounds < 12) {
            throw new Error("Minimum count of bcrypt rounds is 12. Smaller number is considered unsafe.");
        }
    }

    public hashPassword(password: string): Promise<string> {
        if (isNullOrUndefined(password)) {
            throw new Error("Cannot hash null or undefined password.");
        }

        return bcrypt.hash(password, this._bcryptRounds);
    }

    public verifyPassword(password: string, expectedHash: string): Promise<boolean> {
        return bcrypt.compare(password, expectedHash);
    }

    public randomHex(length: number): string {
        if (length < 1) {
            throw new Error("Cannot generate random hex shorter than 1 character.");
        }

        return crypto
            .randomBytes(Math.ceil(length / CHARS_PER_BYTE))
            .toString("hex")
            .toUpperCase();
    }

    public hmacSignatureHex(data: string, key: string): string {
        if (!data) {
            throw new Error("Cannot generate HMAC signature for empty data.");
        }
        if (!key) {
            throw new Error("Cannot generate HMAC signature without any key.");
        }

        const hmac = crypto.createHmac("sha256", key);
        hmac.update(data);
        return hmac.digest("hex");
    }

    public verifyHmacSignature(data: string, signature: string, key: string): boolean {
        if (!data) {
            throw new Error("Cannot verify HMAC signature of empty data.");
        }
        if (!signature) {
            throw new Error("Cannot verify HMAC without signature.");
        }
        if (!key) {
            throw new Error("Cannot verify HMAC signature without any key.");
        }

        const hmac = crypto.createHmac("sha256", key);
        hmac.update(data);
        const expected = hmac.digest("hex").toLowerCase();
        return expected === signature.toLowerCase();
    }
}
