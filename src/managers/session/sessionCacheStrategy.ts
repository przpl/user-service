import { SessionEntity } from "../../dal/entities/sessionEntity";

export interface SessionCacheStrategy {
    set(id: string, userId: string): Promise<void>;
    remove(session: SessionEntity): Promise<void>;
    removeMany(sessions: SessionEntity[]): Promise<void>;
    removeManyByIds(ids: string[]): Promise<void>;
}
