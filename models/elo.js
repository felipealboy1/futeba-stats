// models/elo.js
// Elo adaptado para futebol (ESM)
// - rating inicial 1500
// - K dinâmico (base + ajustado por diferença de gols)
// - home advantage aplicável
import { getAllTimes } from "../services/times.js";
import { getAllGames } from "../services/games.js";

/**
 * Parâmetros do modelo (ajustáveis)
 */
const INITIAL_RATING = 1500;
const HOME_ADVANTAGE = 65; // pontos de vantagem para o time da casa
const K_BASE = 20; // base K
const GOAL_DIFF_WEIGHT = 0.5; // maior diferença de gols aumenta K por (1 + (gd-1)*GOAL_DIFF_WEIGHT)

/**
 * Inicializa ratings a partir dos times do dados/times.json
 * Retorna mapa { slug -> ratingObject } e { id -> ratingObject }.
 */
export async function initRatings(ano = "2025") {
  const times = await getAllTimes();
  const mapBySlug = new Map();
  const mapById = new Map();
  for (const t of times) {
    const r = { id: t.id ?? null, slug: t.slug ?? null, nome: t.nome ?? null, rating: INITIAL_RATING };
    if (r.slug) mapBySlug.set(r.slug, r);
    if (r.id !== null && r.id !== undefined) mapById.set(Number(r.id), r);
  }
  return { bySlug: mapBySlug, byId: mapById };
}

/**
 * Esperança Elo (We) do time A contra B (considerando home advantage)
 * diff = ratingA - ratingB + homeAdv (se A for mandante)
 * formula: We = 1 / (1 + 10^(-diff / 400))
 */
function expectedScore(ratingA, ratingB, isHome = false) {
  const diff = ratingA - ratingB + (isHome ? HOME_ADVANTAGE : 0);
  const We = 1 / (1 + Math.pow(10, -diff / 400));
  return We;
}

/**
 * K dinâmico: aumenta quando a diferença de gols é maior
 * goalDiff >=1
 */
function dynamicK(goalDiff = 1) {
  if (!Number.isFinite(goalDiff) || goalDiff <= 1) return K_BASE;
  return Math.round(K_BASE * (1 + (goalDiff - 1) * GOAL_DIFF_WEIGHT));
}

/**
 * Aplica atualização Elo para um único jogo concluído.
 * jogo: { mandante: {id,...}, visitante: {...}, gols_mandante, gols_visitante, rodada }
 * ratingsById: Map(id -> {rating, ...})
 */
export function applyGameElo(jogo, ratingsById) {
  const homeId = Number(jogo.mandante?.id);
  const awayId = Number(jogo.visitante?.id);

  const homeObj = ratingsById.get(homeId) ?? { rating: INITIAL_RATING };
  const awayObj = ratingsById.get(awayId) ?? { rating: INITIAL_RATING };

  const Rh = homeObj.rating;
  const Ra = awayObj.rating;

  const We = expectedScore(Rh, Ra, true);
  const Wa = expectedScore(Ra, Rh, false); // or 1-We? but compute symmetric

  // resultado real
  let Sh = 0;
  let Sa = 0;
  if (Number(jogo.gols_mandante) > Number(jogo.gols_visitante)) Sh = 1;
  else if (Number(jogo.gols_mandante) === Number(jogo.gols_visitante)) { Sh = 0.5; Sa = 0.5; }
  else Sa = 1;

  // goal diff for K
  const gd = Math.abs(Number(jogo.gols_mandante) - Number(jogo.gols_visitante)) || 1;
  const K = dynamicK(gd);

  // atualiza
  const newRh = Rh + K * (Sh - We);
  const newRa = Ra + K * (Sa - Wa);

  // write back
  if (!ratingsById.has(homeId)) ratingsById.set(homeId, { rating: newRh });
  else ratingsById.get(homeId).rating = newRh;

  if (!ratingsById.has(awayId)) ratingsById.set(awayId, { rating: newRa });
  else ratingsById.get(awayId).rating = newRa;
}

/**
 * Recalcula ratings a partir de todos os jogos FINALIZADOS (ordem cronológica pelas rodadas)
 * Retorna Map id-> { rating, id }
 */
export async function recalcRatingsFromSeason(ano = "2025") {
  const { bySlug, byId } = await initRatings(ano);

  // transformar byId em Map id->obj atualizável
  const ratingsById = new Map();
  for (const [id, obj] of byId.entries()) {
    ratingsById.set(Number(id), { rating: obj.rating ?? INITIAL_RATING });
  }

  // pegar todos jogos finalizados em ordem
  const allGames = await getAllGames(ano); // retorna todos jogos ordenados por rodada
  // filtrar apenas finalizados
  const finished = allGames.filter(g => g.status === "FINALIZADO");

  // ordenar por rodada asc
  finished.sort((a, b) => a.rodada - b.rodada);

  for (const g of finished) {
    applyGameElo(g, ratingsById);
  }

  // garantir que todos times do cadastro existam
  for (const [id, t] of byId.entries()) {
    if (!ratingsById.has(Number(id))) ratingsById.set(Number(id), { rating: INITIAL_RATING });
  }

  return ratingsById;
}
