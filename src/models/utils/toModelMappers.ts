import { RequestBody } from "../../types/express/requestBody";
import { Credentials } from "../credentials";
import { Phone } from "../phone";

export function extractCredentials(body: RequestBody): Credentials {
    return new Credentials(body.email, body.username, extractPhone(body));
}

export function extractCredentialsWithoutUsername(body: RequestBody): Credentials {
    return new Credentials(body.email, null, extractPhone(body));
}

function extractPhone(body: RequestBody): Phone {
    if (body.phone && body.phone.code && body.phone.number) {
        return new Phone(body.phone.code, body.phone.number);
    }
    return null;
}
