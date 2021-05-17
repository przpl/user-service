import { PhoneDto } from "./dtos/phoneDto";
import { Phone } from "./phone";

export function dtoFromPhoneModel(phone: Phone): PhoneDto {
    return { code: phone.code, number: phone.number };
}
