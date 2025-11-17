// scripts/precalcProbs.js
// Uso: node scripts/precalcProbs.js --ano=2025
import path from "path";
import fs from "fs";
import { getAllGames } from "../services/games.js";
import { predictGameById } from "../models/predict.js";

const args = process.argv.slice(2);
const anoArg = args.find(a => a.startsWith("--ano="));
const ano = anoArg ? anoArg.split("=")[1] : "2025";

async function main() {
  try {
    const games = await getAllGames(ano);
    const out = {};
    for (const g of games) {
      const gid = String(g.id || g.id_jogo || g.num_jogo || "");
      if (!gid) continue;
      try {
        const numericId = Number(gid) || undefined;
        if (!numericId) {
          // fallback: skip
          out[gid] = { home: 0.33, draw: 0.34, away: 0.33 };
          continue;
        }
        const pred = await predictGameById(ano, numericId);
        if (pred && pred.probs && typeof pred.probs.home !== "undefined") {
          out[gid] = pred.probs;
        } else {
          out[gid] = { home: 0.33, draw: 0.34, away: 0.33 };
        }
      } catch (e) {
        out[gid] = { home: 0.33, draw: 0.34, away: 0.33 };
      }
    }

    const cacheDir = path.resolve("dados", "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const p = path.join(cacheDir, `probs_${ano}.json`);
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
    console.log("✅ Probs pré-calculadas salvas em:", p);
  } catch (err) {
    console.error("Erro no precalcProbs:", err.message || err);
  }
}

main();
