import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "session" })
export class SessionEntity extends BaseEntity {
    @PrimaryColumn()
    token: string;

    @Column() // TODO foreign key
    userId: string;

    @Column({ type: "date" })
    lastUseAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
