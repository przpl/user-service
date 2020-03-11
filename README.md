Migrations

1. Build app to make sure .js code is up to date
npm run build

2. Create:
typeorm migration:generate -n AddSomeColumnToSome

3. We want the migration file to be stored in respository. Move created migration file from dist/dal/migrations to src/dal/migrations.
Add /* eslint-disable quotes */ at the top of the file to disable unecessary eslint errors.

4. Build app:
npm run build

5. Run all migrations:
typeorm migration:run