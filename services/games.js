// services/games.js
import fs from "fs";
import path from "path";
import { normalizarTime } from "./normalizarTime.js";
import { getAllTimes } from "./times.js";

/**
 * Robust getGamesByRodada / getAllGames
 * - garante array de saída sempre
 * - valida estrutura básica de cada jogo
 * - loga problemas (para você inspecionar rapidamente)
 */

const BASE_NORMALIZED = path.join(process.cwd(), "dados_normalizados", "jogos");
const BASE_RAW = path.join(process.cwd(), "dados", "jogos");

function safeReadJson(filePath) {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    if (!txt) return null;
    return JSON.parse(txt);
  } catch (err) {
    // log leve para debugging
    //console.warn("safeReadJson falhou:", filePath, err.message);
    return null;
  }
}

export function isOfficiallyFinalizedFromRaw(rawGame) {
  if (!rawGame) return false;
  const docs = rawGame.documentos || rawGame.documents || rawGame.document || [];
  if (!Array.isArray(docs)) return false;
  for (const d of docs) {
    const title = (d.title || d.titulo || "").toLowerCase();
    const url = (d.url || "").toLowerCase();
    if (title.includes("súmula") || title.includes("sumula") || url.includes("/sumulas/") || url.includes("/sumula/")) {
      return true;
    }
  }
  return false;
}

function buildTeamMap(times) {
  const mapByName = new Map();
  for (const t of times) {
    if (t && t.nome) mapByName.set(String(t.nome).toLowerCase(), t.id);
    if (t && t.slug) mapByName.set(String(t.slug).toLowerCase(), t.id);
  }
  return mapByName;
}

function ensureGameShape(g) {
  // devolve um objeto de jogo mínimo esperado pelo restante do sistema
  return {
    id: g?.id ?? g?.id_jogo ?? g?.num_jogo ?? null,
    rodada: g?.rodada ?? null,
    data: g?.data ?? null,
    hora: g?.hora ?? null,
    mandante: (g?.mandante && typeof g.mandante === "object") ? { ...g.mandante } : { nome: g?.mandante || null, id: g?.mandante?.id ?? null, slug: g?.mandante?.slug ?? null },
    visitante: (g?.visitante && typeof g.visitante === "object") ? { ...g.visitante } : { nome: g?.visitante || null, id: g?.visitante?.id ?? null, slug: g?.visitante?.slug ?? null },
    gols_mandante: typeof g?.gols_mandante !== "undefined" ? g.gols_mandante : (typeof g?.golsMandante !== "undefined" ? g.golsMandante : null),
    gols_visitante: typeof g?.gols_visitante !== "undefined" ? g.gols_visitante : (typeof g?.golsVisitante !== "undefined" ? g.golsVisitante : null),
    status: g?.status ?? g?.estado ?? null,
    raw: g // manter original para debugging se necessário
  };
}

function safeLower(s) { return String(s ?? "").toLowerCase(); }

/**
 * getGamesByRodada:
 * - lê arquivos normalizados e raw
 * - normaliza nomes e tenta mapear IDs via getAllTimes
 * - garante array como retorno
 */
export async function getGamesByRodada(ano = "2025", rodada) {
  const normPath = path.join(BASE_NORMALIZED, ano, `rodada_${rodada}.json`);
  const rawPath = path.join(BASE_RAW, ano, `rodada_${rodada}.json`);

  const normalizedRaw = safeReadJson(normPath);
  const raw = safeReadJson(rawPath);
  const normalized = Array.isArray(normalizedRaw) ? normalizedRaw : [];

  // Carrega times oficiais e monta mapa
  const times = await getAllTimes().catch(() => []);
  const mapByName = buildTeamMap(Array.isArray(times) ? times : []);

  // Monta mapa raw-id -> raw game (string keys)
  const rawMap = new Map();
  if (Array.isArray(raw)) {
    for (const r of raw) {
      const key = safeLower(String(r?.id_jogo ?? r?.id ?? r?.num_jogo ?? ""));
      if (key) rawMap.set(key, r);
    }
  }

  const output = [];
  let index = 0;
  for (const g of normalized) {
    index++;
    try {
      const possibleKeys = [
        safeLower(String(g?.id ?? "")),
        safeLower(String(g?.id_jogo ?? "")),
        safeLower(String(g?.num_jogo ?? ""))
      ];
      let rawMatch = null;
      for (const k of possibleKeys) {
        if (k && rawMap.has(k)) { rawMatch = rawMap.get(k); break; }
      }

      const finalized = isOfficiallyFinalizedFromRaw(rawMatch);

      // normalizar nomes robusto
      const nomeMandante = normalizarTime(g?.mandante?.nome ?? (g?.mandante ?? ""));
      const nomeVisitante = normalizarTime(g?.visitante?.nome ?? (g?.visitante ?? ""));

      const idMandante = mapByName.get(safeLower(nomeMandante)) ?? (g?.mandante?.id ?? null);
      const idVisitante = mapByName.get(safeLower(nomeVisitante)) ?? (g?.visitante?.id ?? null);

      // Se nomeMan/NomeVisitante ficaram vazios, tente fallback para g.mandante (string) ou slug
      if (!nomeMandante && g?.mandante) {
        if (typeof g.mandante === "string") {
          // manter string, marcar aviso
          //console.warn("Mandante came as string:", g.mandante);
        }
      }

      const game = ensureGameShape(g);

      game.officialFinalized = !!finalized || (String(game.status ?? "").toUpperCase().includes("FINAL"));

      // garantir mandante/visitante objetos com id/nome/slug
      game.mandante = {
        nome: nomeMandante || String(game.mandante?.nome ?? "") || null,
        id: idMandante ?? (game.mandante?.id ?? null),
        slug: game.mandante?.slug ?? null
      };
      game.visitante = {
        nome: nomeVisitante || String(game.visitante?.nome ?? "") || null,
        id: idVisitante ?? (game.visitante?.id ?? null),
        slug: game.visitante?.slug ?? null
      };

      // validar campos mínimos
      if (!game.mandante?.nome || !game.visitante?.nome) {
        console.warn(`[games.js] rodada_${rodada} jogo#${index} sem nomes:`, { id: game.id, mandante: game.mandante, visitante: game.visitante });
        // ainda pushamos um objeto defensivo (para manter indice/ordem). A simulação deve ignorar jogos inválidos depois.
        output.push(game);
        continue;
      }

      // push seguro
      output.push(game);
    } catch (err) {
      console.error(`[games.js] erro normalizando jogo na rodada ${rodada} index ${index}:`, err && err.message);
      // não interromper — push objeto mínimo
      output.push(ensureGameShape(g));
    }
  }

  // Garantia final: sempre array
  return Array.isArray(output) ? output : [];
}

/** Retorna todos os jogos, usando getGamesByRodada para normalização */
export async function getAllGames(ano = "2025") {
  const dir = path.join(BASE_NORMALIZED, ano);
  let all = [];
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const rodadaN = Number(f.replace("rodada_", "").replace(".json", ""));
      const norm = await getGamesByRodada(ano, rodadaN);
      if (Array.isArray(norm)) all = all.concat(norm);
    }
  } catch (err) {
    console.error("[games.js] getAllGames erro lendo dir:", dir, err && err.message);
    return [];
  }
  return all;
}

export async function getGameById(ano = "2025", id) {
  const all = await getAllGames(ano);
  return all.find((g) => Number(g.id) === Number(id) || Number(g.id_jogo) === Number(id)) || null;
}

export async function getGamesByTime({ slug, ano = "2025" }) {
  const all = await getAllGames(ano);
  return all.filter((g) => (g.mandante?.slug === slug) || (g.visitante?.slug === slug));
}
