import { Entity, BaseEntity, CreateDateColumn, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "password-reset" })
export class PasswordResetEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @Column()
    code: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
