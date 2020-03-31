import { Entity, BaseEntity, PrimaryColumn, CreateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { UserEntity } from "./userEntity";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(type => UserEntity, { primary: true })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @PrimaryColumn()
    role: string;

    // TODO - who granted role to the user

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
