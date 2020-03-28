import { singleton } from "tsyringe";

@singleton()
export class QueueService {
    public pushEmailCode(email: string, code: string) {
        // TODO implement
    }

    public pushNewUser(userData: object) {
        // TODO implement
    }
}
