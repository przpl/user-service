import { body } from "express-validator";
import { singleton } from "tsyringe";

import { AbstractValidator } from "./abstractValidator";
import { FIELD_ERROR_MSG, fieldValidators } from "./fieldValidators";
import { ValidatorArray } from "./validatorArray";

@singleton()
export default class InternalValidator extends AbstractValidator {
    public userIdParam: ValidatorArray = [fieldValidators.userIdParam, this.validate];

    public role: ValidatorArray = [
        fieldValidators.userId,
        body("userRole").isString().withMessage(FIELD_ERROR_MSG.isString).trim(),
        this.validate,
    ];
}
