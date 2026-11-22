import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const migrationDirectory = join(process.cwd(), "drizzle");
const files = (await readdir(migrationDirectory))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

if (files.length === 0) {
  console.log("No SQL migrations found.");
  process.exit(0);
}

const client = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  ssl: "require"
});

try {
  for (const file of files) {
    const migrationSql = await readFile(join(migrationDirectory, file), "utf8");
    const statements = migrationSql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await client.begin(async (transaction) => {
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          migration_id text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      const existing = await transaction`
        SELECT migration_id FROM schema_migrations WHERE migration_id = ${file}
      `;
      if (existing.length > 0) return;

      for (const statement of statements) {
        await transaction.unsafe(statement);
      }

      await transaction`
        INSERT INTO schema_migrations (migration_id) VALUES (${file})
      `;
    });

    console.log(`Applied migration: ${file}`);
  }
} finally {
  await client.end();
}