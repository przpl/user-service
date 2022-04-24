# User Service

'User Service' is a small service providing basic user functions:

-   register and log in with email
-   confirm user email
-   register and log in with Facebook or Google
-   reset and change user password
-   log in with 2FA
-   cookie or JWT based sessions (can be switched in config)

This service should be used as a microservice with communication through REST API and RabbitMQ. Main backend in your app can act as a proxy for User Service or frontend can directly communicate with its API.

WARNING! This is an experimental project created in my spare time. It is NOT ready to run in a production environment and probably will never be, however it is still suitable for MVP. The main purpose of this project was to provide a playground for testing some features and to expand my knowledge about user authentication.

# Documentation

There is no documentation of how to communicate with this service, so you have to figure it out by yourself.

## Required external services:

1. PostgreSQL (versions 13 and 14 tested)
2. Redis (version 6 tested)
3. RabbitMQ (version 3 tested)

## Configuration

1. Copy config.json.dist to config.json (same directory).
2. Copy .env.dist to .env (same directory).
3. If you need to use TypeORM CLI, copy dataSource.ts.dist to ./src/dataSource.ts.

## Database migrations

1. Create migration:
   npm run migration:generate ./src/dal/migrations/<NAME>

2. Include migration in typeOrmConfig.ts

3. Run all migrations:
   npm run migration:run

# Docker

1. Build: `docker build . -t user-service`
2. Run: `docker run -p 3000:3000 -v "$(pwd)/.env:/home/node/.env" -v "$(pwd)/config.json:/home/node/config.json" --name user-service user-service`

# Other info

Session token is constructed from user id and session id: "<userId>:<sessionId>"
