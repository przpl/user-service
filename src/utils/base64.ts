export function base64ToHttpFriendly(base64: string): string {
    return base64.replace(/\//g, "_").replace(/\+/g, "-");
}
