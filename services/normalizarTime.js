// services/normalizarTime.js
// Normalizador inteligente de nomes de times vindo da CBF ou de qualquer fonte.

import path from "path";
import { readFileSync } from "fs";

// Carrega times oficiais
const TIMES_PATH = path.resolve("dados/times.json");
const TIMES = JSON.parse(readFileSync(TIMES_PATH, "utf8"));

// Função de limpeza: remove lixo textual e sufixos
function limparTexto(str) {
  return String(str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")        // remove acentos
    .replace(/\./g, "")                                      // remove ponto
    .replace(/\b(saf|sa[f]?|ltda|fc|ec)\b/gi, "")            // remove sufixos mais comuns
    .replace(/futebol clube/gi, "")
    .replace(/esporte clube/gi, "")
    .replace(/foot.?ball/gi, "")
    .replace(/futebol/gi, "")
    .replace(/clube/gi, "")
    .replace(/regatas/gi, "")
    .replace(/sociedade esportiva/gi, "")
    .replace(/\s+/g, " ")                                    // normaliza múltiplos espaços
    .trim()
    .toLowerCase();
}

// Similaridade aproximada
function similaridade(a, b) {
  a = limparTexto(a);
  b = limparTexto(b);
  if (a === b) return 1.0;

  let hits = 0;
  const aParts = a.split(" ");
  const bParts = b.split(" ");

  for (const pa of aParts) {
    for (const pb of bParts) {
      if (pa === pb) hits++;
    }
  }

  const total = Math.max(aParts.length, bParts.length);
  return hits / total;
}

// Normalização principal
export function normalizarTime(rawNome) {
  if (!rawNome) return rawNome;

  const limpo = limparTexto(rawNome);

  let melhor = null;
  let melhorScore = 0;

  for (const id of Object.keys(TIMES)) {
    const t = TIMES[id];
    const score = similaridade(limpo, t.nome);

    if (score > melhorScore) {
      melhorScore = score;
      melhor = t;
    }
  }

  // Similaridade mínima aceitável
  if (melhorScore < 0.35) {
    console.log("⚠️ Nome não reconhecido:", rawNome, "→ mantendo original");
    return rawNome;
  }

  return melhor.nome;
}
