import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column({ default: false })
    emailConfirmed: boolean;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}
