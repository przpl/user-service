import { Entity, BaseEntity, PrimaryColumn, CreateDateColumn, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "./userEntity";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @PrimaryColumn()
    role: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
