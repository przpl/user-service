import { DataSourceOptions } from "typeorm";

import { ConfirmationEntity } from "./entities/confirmationEntity";
import { ExternalLoginEntity } from "./entities/externalLoginEntity";
import { LocalLoginEntity } from "./entities/localLoginEntity";
import { LockEntity } from "./entities/lockEntity";
import { MfaEntity } from "./entities/mfaEntity";
import { PasswordResetEntity } from "./entities/passwordResetEntity";
import { RoleEntity } from "./entities/roleEntity";
import { SessionEntity } from "./entities/sessionEntity";
import { UserEntity } from "./entities/userEntity";
import { Init1633893610464 } from "./migrations/1633893610464-Init";

export const dataSourceOptions: DataSourceOptions = {
    type: "postgres",
    entities: [
        UserEntity,
        ConfirmationEntity,
        ExternalLoginEntity,
        LocalLoginEntity,
        LockEntity,
        MfaEntity,
        PasswordResetEntity,
        RoleEntity,
        SessionEntity,
    ],
    migrations: [Init1633893610464],
};
