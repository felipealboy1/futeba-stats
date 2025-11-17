// scripts/rebuildProjecao.js
// Força a regeneração da projeção do campeonato

import fs from "fs";
import path from "path";
import { simulateSeason } from "../models/simulacao.js";

const ano = "2025";
const nSim = 10000;

const cacheFile = path.join("dados", "cache", `projecao_${ano}_${nSim}.json`);

async function main() {
  try {
    if (fs.existsSync(cacheFile)) {
      console.log("🗑  Removendo cache antigo...");
      fs.unlinkSync(cacheFile);
    }

    console.log("🔮 Gerando nova projeção do campeonato...");
    const result = await simulateSeason({ ano, nSim });

    console.log("💾 Projeção salva em:", cacheFile);
    console.log("🏁 Atualização concluída.");
  } catch (err) {
    console.error("❌ Erro ao recalcular projeção:", err);
  }
}

main();
