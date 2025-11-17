// services/rodadas.js
// Helpers para listar rodadas e descobrir próximas/atuais
import path from "path";
import { listFiles } from "./utils.js";

/**
 * Lista rodadas existentes em dados_normalizados/jogos/<ano>
 * retorna array de números ordenados.
 */
async function listRodadas(ano = "2025") {
  const dir = path.join("dados_normalizados", "jogos", String(ano));
  const files = await listFiles(dir);
  const rodadas = files
    .map(f => {
      const m = f.match(/rodada_(\d+)\.json/);
      return m ? Number(m[1]) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a - b);
  return rodadas;
}

/**
 * Retorna a próxima rodada depois da última normalizada (útil para pipeline).
 * Se não existirem rodadas retorna null.
 */
async function ultimaRodada(ano = "2025") {
  const r = await listRodadas(ano);
  if (!r.length) return null;
  return r[r.length - 1];
}

export { listRodadas, ultimaRodada };
