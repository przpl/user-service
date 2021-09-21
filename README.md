Required external services:

1. PostgreSQL
2. Redis
3. RabbitMQ

=============================================================================================================================
Configuration

1. Copy config.json.dist to config.json (same directory).
2. Copy .env.dist to .env (save directory).

=============================================================================================================================
Migrations

1. Build app to make sure .js code in dist directory is up to date so TypeORM can detect all entities
   npm run build-ts

2. Create migration:
   typeorm migration:generate -n AddSomeColumnToSome

3. Build app to compile new migration:
   npm run build-ts

4. Run all migrations:
   typeorm migration:run

=============================================================================================================================

Session token is constructed from user id and session id: "<userId>:<sessionId>"

=============================================================================================================================

Docker

1. Build: `docker build . -t user-service`
2. Run: `docker run -p 3000:3000 -v "$(pwd)/.env:/home/node/.env" -v "$(pwd)/config.json:/home/node/config.json" --name user-service user-service`
