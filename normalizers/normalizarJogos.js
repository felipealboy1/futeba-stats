// normalizers/normalizarJogos.js
// Normaliza os arquivos brutos da CBF em um formato consistente.
// Agora com REGRAS CORRETAS para identificar se o jogo foi finalizado:
// Somente considera FINALIZADO se existir documento de SÚMULA no raw.

import fs from "fs";
import path from "path";
import { getAllTimes } from "../services/times.js";

// Base dos arquivos brutos e normalizados
const BASE_RAW = path.join(process.cwd(), "dados", "jogos");
const BASE_OUT = path.join(process.cwd(), "dados_normalizados", "jogos");

// ========== FUNÇÃO PARA LER JSON ==========

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    return null;
  }
}

// ========== REGRAS OFICIAIS PARA SABER SE O JOGO FOI FINALIZADO ==========

function hasOfficialSumula(rawJogo) {
  if (!rawJogo) return false;
  const docs = rawJogo.documentos || [];
  if (!Array.isArray(docs)) return false;

  for (const d of docs) {
    const title = (d.title || "").toLowerCase();
    const url = (d.url || "").toLowerCase();
    if (title.includes("súmula") || title.includes("sumula")) return true;
    if (url.includes("/sumula") || url.includes("/sumulas")) return true;
  }
  return false;
}

// ========== NORMALIZA ESTÁDIO ==========

function parseEstadio(localStr) {
  if (!localStr) {
    return { nome: null, slug: null, cidade: null, estado: null };
  }
  const partes = localStr.split(" - ").map(s => s.trim());
  const nome = partes[0] || null;
  const cidade = partes[1] || null;
  const estado = partes[2] || null;
  return {
    nome,
    slug: nome ? nome.toLowerCase().replace(/\s+/g, "-") : null,
    cidade,
    estado,
  };
}

// ========== NORMALIZAR UM JOGO ==========

function normalizeSingle(raw, timesDict) {
  if (!raw) return null;

  const mid = Number(raw.mandante?.id || null);
  const vid = Number(raw.visitante?.id || null);

  const timeM = timesDict[mid] || {
    id: mid,
    nome: raw.mandante?.nome || "",
    nome_completo: raw.mandante?.nome || "",
    slug: (raw.mandante?.nome || "").toLowerCase().replace(/\s+/g, "-"),
  };

  const timeV = timesDict[vid] || {
    id: vid,
    nome: raw.visitante?.nome || "",
    nome_completo: raw.visitante?.nome || "",
    slug: (raw.visitante?.nome || "").toLowerCase().replace(/\s+/g, "-"),
  };

  // REGLA OFICIAL
  const isFinalizado = hasOfficialSumula(raw);

  const gH = isFinalizado ? Number(raw.mandante?.gols || 0) : 0;
  const gA = isFinalizado ? Number(raw.visitante?.gols || 0) : 0;

  return {
    id: Number(raw.id_jogo || raw.id || raw.num_jogo || null),
    rodada: Number(raw.rodada || raw.num_rodada || 0),
    data: raw.data ? raw.data.replace(/\s+/g, "") : null,
    hora: raw.hora || null,

    mandante: timeM,
    visitante: timeV,

    gols_mandante: gH,
    gols_visitante: gA,

    status: isFinalizado ? "FINALIZADO" : "PENDENTE",

    estadio: parseEstadio(raw.local || null),
  };
}

// ========== NORMALIZAR ARQUIVO DA RODADA ==========
//
// AGORA É ASYNC!
// E usa await getAllTimes()

export async function normalizeRodada(ano, rodada) {
  const rawFile = path.join(BASE_RAW, String(ano), `rodada_${rodada}.json`);
  const outFile = path.join(BASE_OUT, String(ano), `rodada_${rodada}.json`);

  const raw = readJSON(rawFile);
  if (!raw) {
    console.error(`❌ RAW não encontrado: ${rawFile}`);
    return;
  }

  // IMPORTANTE: getAllTimes() é assíncrono
  const timesList = await getAllTimes();
  if (!Array.isArray(timesList)) {
    console.error("❌ ERRO: getAllTimes() não retornou lista!");
    console.error("Valor retornado:", timesList);
    return;
  }

  const timesDict = {};
  for (const t of timesList) timesDict[t.id] = t;

  const normalized = raw
    .map(jogo => normalizeSingle(jogo, timesDict))
    .filter(Boolean);

  fs.mkdirSync(path.join(BASE_OUT, String(ano)), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(normalized, null, 2));

  console.log(`✔ Rodada ${rodada} normalizada (${normalized.length} jogos)`);
}
