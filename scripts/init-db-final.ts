import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { readFileSync } from "fs";

// Carrega variáveis de ambiente do arquivo .env
config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida");
  }

  const sql = neon(process.env.DATABASE_URL);
  const schema = readFileSync("scripts/schema.sql", "utf8");

  try {
    console.log("🚀  Criando estruturas no Neon…");

    // Executar comandos SQL individualmente
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝  Executando ${statements.length} comandos SQL...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`⚡  Executando comando ${i + 1}/${statements.length}`);
        // Usar template literal corretamente
        await sql([statement] as any, statement);
      }
    }

    console.log("✅  Banco de dados inicializado com sucesso!");
  } catch (err) {
    console.error("❌  Falha ao aplicar schema:", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
