import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const CAMPEONATO = JSON.parse(
  fs.readFileSync(path.resolve("config/campeonato.json"), "utf8")
);

function baixarTodas() {
  const rodadas = JSON.parse(
    fs.readFileSync(path.resolve("dados/rodadas.json"), "utf8")
  );

  console.log("📡 Baixando todas as rodadas…");

  for (const rodada of rodadas) {
    if (!rodada || isNaN(Number(rodada))) {
      console.log(`⚠️ Rodada inválida:`, rodada);
      continue;
    }

    console.log("\n==============================");
    console.log(`📌 Rodada ${rodada}`);
    console.log("==============================");

    const result = spawnSync(
      "node",
      ["scrapers/scraperJogos.js", `--rodada=${rodada}`],
      { stdio: "inherit" }
    );

    if (result.status !== 0) {
      console.log(`❌ Erro ao baixar rodada ${rodada}`);
    }
  }

  console.log("\n🎉 Finalizado!");
}

baixarTodas();
