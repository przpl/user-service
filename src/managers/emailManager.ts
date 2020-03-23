import { getRepository } from "typeorm";

import { EmailConfirmEntity } from "../dal/entities/emailConfirmEntity";
import { CryptoService } from "../services/cryptoService";
import { EMAIL_CODE_LENGTH } from "../utils/globalConsts";
import { UserEntity } from "../dal/entities/userEntity";
import { EmailResendCodeLimitException } from "../exceptions/exceptions";

export class EmailManager {
    private _emailConfirmRepo = getRepository(EmailConfirmEntity);
    private _userRepo = getRepository(UserEntity);

    constructor(private _cryptoService: CryptoService, private _resendCountLimit: number) {}

    public async generateCode(userId: string, email: string) {
        const confirm = new EmailConfirmEntity();
        confirm.userId = userId;
        confirm.email = email;
        confirm.code = this._cryptoService.randomNumbersString(EMAIL_CODE_LENGTH);
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
}
