import fs from "fs/promises";
import path from "path";

function safeGet(obj, arr, fallback = null) {
  try {
    return arr.reduce((s, k) => (s && s[k] !== undefined ? s[k] : null), obj) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeRow(raw, i) {
  return {
    posicao: Number(raw.posicao ?? i + 1),
    time: raw.time || raw.clube || null,
    pontos: Number(raw.pontos ?? raw.pts ?? 0),
    jogos: Number(raw.jogos ?? raw.j ?? 0),
    v: Number(raw.v ?? raw.vitorias ?? 0),
    e: Number(raw.e ?? raw.empates ?? 0),
    d: Number(raw.d ?? raw.derrotas ?? 0),
    gf: Number(raw.gf ?? raw.gols_pro ?? 0),
    gc: Number(raw.gc ?? raw.gols_contra ?? 0),
    sg: Number(raw.sg ?? ((raw.gf ?? 0) - (raw.gc ?? 0)))
  };
}

export async function normalizeClassificacaoRodada(ano, rodada) {
  const src = path.join("dados/classificacao", ano, `rodada_${rodada}.json`);
  const destDir = path.join("dados_normalizados/classificacao", ano);
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, `rodada_${rodada}.json`);

  try {
    const raw = JSON.parse(await fs.readFile(src, "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.classificacao || [];
    const norm = arr.map(normalizeRow);

    await fs.writeFile(dest, JSON.stringify(norm, null, 2));
    console.log(`✔ Classificação rodada ${rodada} normalizada`);
  } catch (err) {
    console.error("Erro:", err.message);
  }
}
