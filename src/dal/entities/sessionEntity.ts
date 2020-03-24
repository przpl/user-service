import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "session" })
export class SessionEntity extends BaseEntity {
    @PrimaryColumn()
    token: string;

    @Column() // TODO primary and foreign key? and "uuid" type
    userId: string;

    @Column()
    createIp: string;

    @Column()
    lastRefreshIp: string;

    @Column({ nullable: true })
    browser: string;

    @Column({ nullable: true })
    os: string;

    @Column({ nullable: true })
    osVersion: string;

    @Column({ type: "timestamp" })
    lastUseAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
