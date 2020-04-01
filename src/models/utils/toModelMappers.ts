import { RequestBody } from "../../types/express/requestBody";
import { Credentials } from "../credentials";
import { Phone } from "../phone";

export function extractCredentials(body: RequestBody): Credentials {
    const phoneDto = body.phone;
    let phone: Phone = null;
    if (phoneDto && phoneDto.code && phoneDto.number) {
        phone = new Phone(body.phone.code, body.phone.number);
    }
    return new Credentials(body.email, body.username, phone);
}
