=============================================================================================================================
Migrations

1. Build app to make sure .js code in dist directory is up to date so TypeORM can detect all entities
npm run build

2. Create migration:
typeorm migration:generate -n AddSomeColumnToSome

3. Build app to compile new migration:
npm run build

5. Run all migrations:
typeorm migration:run

=============================================================================================================================
