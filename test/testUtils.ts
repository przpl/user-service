export function shouldStartPostgresContainer() {
    return expect.getState().currentTestName.includes("[withPostgresContainer]");
}

export function shouldStartRedisContainer() {
    return expect.getState().currentTestName.includes("[withRedisContainer]");
}
