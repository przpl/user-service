export interface AccessTokenDto {
    sub: string;
    ref: string;
    rol: string[];
    iat: number;
    exp: number;
}