import { getRepository } from "typeorm";
import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";

import { EmailConfirmEntity } from "../dal/entities/emailConfirmEntity";
import { EMAIL_CODE_LENGTH } from "../utils/globalConsts";
import { UserEntity } from "../dal/entities/userEntity";
import { EmailResendCodeLimitException, EmailResendCodeTimeLimitException } from "../exceptions/exceptions";
import { unixTimestampS, toUnixTimestampS } from "../utils/timeUtils";
import { TimeSpan } from "../utils/timeSpan";
import { Config } from "../utils/config/config";

@singleton()
export class EmailManager {
    private _emailConfirmRepo = getRepository(EmailConfirmEntity);
    private _userRepo = getRepository(UserEntity);
    private _resendCountLimit: number;
    private _resendTimeLimit: TimeSpan;

    constructor(config: Config) {
        this._resendCountLimit = config.localLogin.email.resendLimit;
        this._resendTimeLimit = TimeSpan.fromSeconds(config.localLogin.email.resendTimeLimitSeconds);
    }

    public async generateCode(userId: string, email: string) {
        const confirm = new EmailConfirmEntity();
        confirm.userId = userId;
        confirm.email = email;
        confirm.code = cryptoRandomString({ length: EMAIL_CODE_LENGTH, type: "numeric" });
        confirm.sentCount = 1;
        confirm.lastSendRequestAt = new Date();
        await confirm.save();
    }

    public async getCodeAndIncrementCounter(email: string): Promise<string> {
        const confirm = await this._emailConfirmRepo.findOne({ email: email });
        if (!confirm) {
            return null;
        }

        if (confirm.sentCount >= this._resendCountLimit + 1) {
            throw new EmailResendCodeLimitException();
        }

        if (this.isSendRequestTooOften(confirm.lastSendRequestAt)) {
            throw new EmailResendCodeTimeLimitException();
        }

        confirm.lastSendRequestAt = new Date();
        confirm.sentCount++;
        await confirm.save();

        return confirm.code;
    }

    public async confirmCode(email: string, code: string): Promise<boolean> {
        const confirm = await this._emailConfirmRepo.findOne({ email: email, code: code });
        if (!confirm) {
            return false;
        }
        const user = await this._userRepo.findOne({ id: confirm.userId });
        user.emailConfirmed = true;
        await user.save();
        await this._emailConfirmRepo.remove(confirm);
        return true;
    }

    private isSendRequestTooOften(lastRequestAt: Date): boolean {
        return unixTimestampS() - toUnixTimestampS(lastRequestAt) < this._resendTimeLimit.seconds;
    }
}
