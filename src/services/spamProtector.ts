import { singleton } from "tsyringe";

import { guardNotUndefinedOrNull } from "../utils/guardClauses";

// source: https://github.com/disposable/disposable
@singleton()
export class SpamProtector {
    private _list: Record<string, boolean>;

    public isDisallowedEmail(email: string): boolean {
        guardNotUndefinedOrNull(email);

        const parts = email.split("@");
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new Error("Invalid email address: " + email);
        }
        const domain = parts[1].toLowerCase();
        const list = this.getList();
        return Boolean(list[domain]);
    }

    private getList(): Record<string, boolean> {
        if (this._list) {
            return this._list;
        }

        const listFromFile: string[] = require("../../spam-email-domains.json");
        this._list = {};
        for (const domain of listFromFile) {
            this._list[domain] = true;
        }

        return this._list;
    }
}