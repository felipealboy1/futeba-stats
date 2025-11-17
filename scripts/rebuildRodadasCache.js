// scripts/rebuildRodadasCache.js
import fs from "fs";
import path from "path";

/**
 * Reconstrói dados/cache/rodadas_2025.json a partir de
 * dados_normalizados/jogos/2025/rodada_*.json
 *
 * - Preserva "sims" do cache antigo quando encontra correspondência (por nome).
 * - Marca "tipo": "real" quando o jogo está FINALIZADO.
 * - Escreve o JSON final em dados/cache/rodadas_2025.json
 */

const ANO = "2025";
const NORMALIZED_DIR = path.join("dados_normalizados", "jogos", ANO);
const CACHE_DIR = path.join("dados", "cache");
const CACHE_FILE = path.join(CACHE_DIR, `rodadas_${ANO}.json`);
const ENCODING = "utf8";

function normalizeName(s = "") {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, ENCODING));
  } catch (err) {
    return null;
  }
}

async function main() {
  // 1) ler cache antigo (se existir) para preservar sims
  const oldCache = readJsonSafe(CACHE_FILE) || [];
  const simsMap = new Map();
  for (const item of oldCache) {
    const key = `${normalizeName(item.mandante)}|${normalizeName(item.visitante)}`;
    if (item.sims) simsMap.set(key, item.sims);
  }

  // 2) ler todos os arquivos normalizados de rodada
  if (!fs.existsSync(NORMALIZED_DIR)) {
    console.error("Diretório normalizado não existe:", NORMALIZED_DIR);
    process.exitCode = 1;
    return;
  }

  const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith(".json"));
  // ordenar por nome para manter ordem (rodada_1, rodada_2, ...)
  files.sort();

  const output = [];

  for (const file of files) {
    const filePath = path.join(NORMALIZED_DIR, file);
    const data = readJsonSafe(filePath);
    if (!Array.isArray(data)) continue;

    for (const g of data) {
      // adaptar aos campos que você mostrou (ajuste se necessário)
      const mandanteNome = g.mandante?.nome || g.mandante || "";
      const visitanteNome = g.visitante?.nome || g.visitante || "";

      const key = `${normalizeName(mandanteNome)}|${normalizeName(visitanteNome)}`;
      const sims = simsMap.get(key) || null;

      const status = (g.status || "").toUpperCase();
      const isFinal = status === "FINALIZADO" || status === "FINALIZADA" || status === "FINAL";
      const golsMand = (g.gols_mandante ?? g.golsMandante ?? g.golsMandante) || g.gols_mandante === 0 ? Number(g.gols_mandante ?? g.golsMandante ?? 0) : null;
      const golsVis = (g.gols_visitante ?? g.golsVisitante ?? g.gols_visitante) || g.gols_visitante === 0 ? Number(g.gols_visitante ?? g.golsVisitante ?? 0) : null;

      let placar = null;
      if (isFinal && Number.isInteger(golsMand) && Number.isInteger(golsVis)) {
        placar = `${golsMand} x ${golsVis}`;
      }

      const item = {
        rodada: Number(g.rodada ?? g.rodada_num ?? g.rodada_numero ?? 0) || undefined,
        mandante: mandanteNome,
        visitante: visitanteNome,
        placar: placar || (g.placar || null),
        tipo: isFinal ? "real" : (g.tipo || "simulado"),
      };

      // incluir sims se existirem (para jogos ainda simulados onde queremos manter as probabilidades)
      if (sims) item.sims = sims;

      // incluir id do jogo se existir (ajuda matching no futuro)
      if (g.id) item.id = g.id;

      output.push(item);
    }
  }

  // 3) escrever no cache
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2), ENCODING);
    console.log("Rodadas cache reconstruído em", CACHE_FILE, "com", output.length, "itens");
  } catch (err) {
    console.error("Erro ao escrever cache:", err);
    process.exitCode = 1;
  }
}

main();
