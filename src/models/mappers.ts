import { Phone } from "./phone";

import { PhoneDto } from "./dtos/phoneDto";

export function dtoFromPhoneModel(phone: Phone): PhoneDto {
    return { code: phone.code, number: phone.number };
}
