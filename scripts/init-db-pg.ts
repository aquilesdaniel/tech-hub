import { readFileSync } from "fs";
import { Pool } from "pg";
import { config } from "dotenv";

// Carrega variáveis de ambiente do arquivo .env
config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida");
  }

  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const schema = readFileSync("scripts/schema.sql", "utf8");

  try {
    console.log("🚀  Criando estruturas no Neon…");

    // Executar o script completo
    await client.query(schema);

    console.log("✅  Banco de dados inicializado com sucesso!");
  } catch (err) {
    console.error("❌  Falha ao aplicar schema:", err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
