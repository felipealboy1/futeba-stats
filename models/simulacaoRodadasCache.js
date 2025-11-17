import fs from "fs";
import path from "path";
import { simularRodadas } from "./simulacaoRodadas.js";
import { getAllGames } from "../services/games.js";

const CACHE_DIR = path.resolve("dados", "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function readSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return null; }
}

function writeSafe(file, obj) {
  fs.writeFileSync(file + ".tmp", JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(file + ".tmp", file);
}

// ---------------------------------------------
// NORMALIZAÇÃO PARA ASSINATURA
// ---------------------------------------------
function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ---------------------------------------------
// Gera assinatura robusta dos jogos reais
// ---------------------------------------------
function assinaturaJogos(lista) {
  return lista
    .map(j => ({
      rodada: j.rodada,
      mandante: normalize(j.mandante),
      visitante: normalize(j.visitante),
      placar: normalize(j.placar)
    }))
    .sort((a, b) => 
      a.rodada - b.rodada ||
      a.mandante.localeCompare(b.mandante) ||
      a.visitante.localeCompare(b.visitante)
    )
    .map(j => `${j.rodada}:${j.mandante}:${j.visitante}:${j.placar}`)
    .join("|");
}

// ---------------------------------------------
// Verifica se o cache precisa atualizar
// ---------------------------------------------
export async function cacheNeedsUpdate(ano = "2025") {
  const cacheFile = path.join(CACHE_DIR, `rodadas_${ano}.json`);

  if (!fs.existsSync(cacheFile)) return true;

  const cached = readSafe(cacheFile);
  if (!cached || !Array.isArray(cached)) return true;

  // Jogos reais do CACHE
  const jogosCache = cached.flatMap(r =>
    r.jogos
      .filter(j => j.tipo === "real")
      .map(j => ({
        rodada: r.rodada,
        mandante: j.mandante,
        visitante: j.visitante,
        placar: j.placar
      }))
  );

  // Jogos reais ATUAIS
  const jogosAtuaisRaw = await getAllGames(ano);
  const jogosAtuais = jogosAtuaisRaw
    .filter(j => j.officialFinalized === true)
    .map(j => ({
      rodada: j.rodada,
      mandante: j.mandante.nome,
      visitante: j.visitante.nome,
      placar: `${j.gols_mandante} x ${j.gols_visitante}`
    }));

  const assinaturaCache = assinaturaJogos(jogosCache);
  const assinaturaAtual = assinaturaJogos(jogosAtuais);

  return assinaturaCache !== assinaturaAtual;
}

// ---------------------------------------------
// Retorna cache ou gera se necessário
// ---------------------------------------------
export async function getSimulacaoRodadasCached(ano = "2025") {
  const file = path.join(CACHE_DIR, `rodadas_${ano}.json`);

  const cached = readSafe(file);
  if (cached) return cached;

  const fresh = await simularRodadas(ano, false);
  writeSafe(file, fresh);
  return fresh;
}

// ---------------------------------------------
// Rebuild forçado
// ---------------------------------------------
export async function rebuildSimulacaoRodadas(ano = "2025") {
  const file = path.join(CACHE_DIR, `rodadas_${ano}.json`);

  if (fs.existsSync(file)) fs.unlinkSync(file);

  const fresh = await simularRodadas(ano, true);
  writeSafe(file, fresh);
  return fresh;
}
