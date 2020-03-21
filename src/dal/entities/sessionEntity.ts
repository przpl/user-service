import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "session" })
export class SessionEntity extends BaseEntity {
    @PrimaryColumn()
    token: string;

    @Column() // TODO primary and foreign key?
    userId: string;

    @Column({ type: "timestamp" })
    lastUseAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
