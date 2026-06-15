import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Carrega variáveis de ambiente do arquivo .env
config();

// ------------------------------------------------------------------
// Lê o SQL em scripts/schema.sql e executa no banco apontado por
// process.env.DATABASE_URL
// ------------------------------------------------------------------
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida");
  }

  const sql = neon(process.env.DATABASE_URL);
  const schema = readFileSync("scripts/schema.sql", "utf8");

  try {
    console.log("🚀  Criando estruturas no Neon…");

    // Executar o schema SQL - dividindo por statements individuais
    const statements = schema.split(";").filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await sql`${statement.trim()}`;
      }
    }

    console.log("✅  Banco de dados inicializado com sucesso!");
  } catch (err) {
    console.error("❌  Falha ao aplicar schema:", err);
  } finally {
    process.exit(0);
  }
}

main();
