import { singleton } from "tsyringe";

import { fieldValidators, FIELD_ERROR_MSG } from "./fieldValidators";
import { ValidatorArray } from "./validatorArray";
import { AbstractValidator } from "./abstractValidator";
import { body } from "express-validator";

@singleton()
export default class InternalValidator extends AbstractValidator {
    public userIdParam: ValidatorArray = [fieldValidators.userIdParam, this.validate];

    public role: ValidatorArray = [
        fieldValidators.userId,
        body("userRole").isString().withMessage(FIELD_ERROR_MSG.isString).trim(),
        this.validate,
    ];
}
