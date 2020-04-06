import { Entity, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    constructor(id: string) {
        super();
        this.id = id;
    }

    @PrimaryColumn()
    id: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
