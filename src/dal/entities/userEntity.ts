import { Entity, BaseEntity, CreateDateColumn, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    constructor(id: string, username?: string) {
        super();
        this.id = id;
        this.username = username;
    }

    @PrimaryColumn()
    id: string;

    @Column()
    username: string; // helpful with finding username duplicates between external and local accounts

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
