import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "email-confirmation" })
export class EmailConfirmEntity extends BaseEntity {
    @PrimaryColumn()
    email: string;

    @Column() // TODO foreign key
    userId: string;

    @Column()
    code: string;

    @Column({ type: "smallint", default: 0 })
    sentCount: number;

    @Column({ type: "timestamp" })
    lastSendRequestAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
