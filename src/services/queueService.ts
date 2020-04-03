import { singleton } from "tsyringe";

import { Phone } from "../models/phone";

@singleton()
export class QueueService {
    public pushEmailCode(email: string, code: string) {
        // TODO implement
    }

    public pushPhoneCode(phone: Phone, code: string) {
        // TODO implement
    }

    public pushNewUser(userData: object) {
        // TODO implement
    }
}
