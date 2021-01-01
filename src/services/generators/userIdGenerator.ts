export interface UserIdGenerator {
    generate(seed: string): string;
}
