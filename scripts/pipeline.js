import { spawnSync } from "child_process";

function run(cmd, args = []) {
  console.log("\n----------------------------------------");
  console.log(`▶️  Rodando: ${cmd} ${args.join(" ")}`);
  console.log("----------------------------------------");

  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });

  if (result.status !== 0) {
    console.error(`❌ Erro ao rodar: ${cmd} ${args.join(" ")}`);
    process.exit(1);
  }
}

console.log("\n========================================");
console.log("🏁 Iniciando atualização completa...");
console.log("========================================");

// 1) Baixar todas as rodadas
run("node", ["scrapers/scraperRodadas.js"]);

// 2) Baixar todos os jogos
run("node", ["scrapers/scraperTodasRodadas.js"]);

// 3) Normalizar jogos (todas rodadas)
run("node", ["scripts/normalizarCli.js", "--ano=2025", "--todas"]);

// 4) Normalizar classificação (se já existir scraper de classificação)
run("node", ["scripts/normalizarCli.js", "--classificacao", "--ano=2025", "--todas"]);

// 5) Opcional: atualizar classificação bruta antes de normalizar
// run("node", ["scrapers/scraperClassificacao.js"]);

console.log("\n========================================");
console.log("🎉 Atualização concluída!");
console.log("========================================");
