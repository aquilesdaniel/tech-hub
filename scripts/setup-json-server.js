const fs = require("fs");
const { exec } = require("child_process");

// Instalar json-server globalmente se não estiver instalado
exec("npm list -g json-server", (error, stdout, stderr) => {
  if (error) {
    console.log("Instalando json-server...");
    exec("npm install -g json-server", (installError) => {
      if (installError) {
        console.error("Erro ao instalar json-server:", installError);
        return;
      }
      console.log("json-server instalado com sucesso!");
      startServer();
    });
  } else {
    console.log("json-server já está instalado");
    startServer();
  }
});

function startServer() {
  console.log("Iniciando servidor JSON...");
  exec("json-server --watch db.json --port 3001", (error, stdout, stderr) => {
    if (error) {
      console.error("Erro ao iniciar servidor:", error);
      return;
    }
    console.log("Servidor rodando em http://localhost:3001");
  });
}
