// models/predict.js
import { recalcRatingsFromSeason } from "./elo.js";
import { getGameById, getGamesByRodada } from "../services/games.js";

/**
 * Converte diferença de rating em probabilidades (vitória casa / empate / vitória visitante)
 * Estratégia:
 *  - We = expectedScore (Elo) including home advantage (we reuse formula here)
 *  - drawProb baseline modulado pela diferença: drawBase * exp(-|diff|/200)
 *  - P_home = We * (1 - drawProb)
 *  - P_away = (1 - We) * (1 - drawProb)
 *
 * Valores padrão:
 *  drawBase = 0.27 (aprox. taxa histórica de empates)
 */
function expectedFromRatings(ratingHome, ratingAway, homeAdv = 65, drawBase = 0.27) {
  const diff = ratingHome - ratingAway + homeAdv;
  const We = 1 / (1 + Math.pow(10, -diff / 400));
  const drawProb = Math.max(0.05, drawBase * Math.exp(-Math.abs(diff) / 200));
  const pHome = We * (1 - drawProb);
  const pAway = (1 - We) * (1 - drawProb);
  // normalize small numeric errors
  const total = pHome + drawProb + pAway;
  return { home: pHome / total, draw: drawProb / total, away: pAway / total, We };
}

/**
 * Predict a single jogo by id
 */
export async function predictGameById(ano = "2025", jogoId) {
  if (!jogoId && jogoId !== 0) return null;
  const game = await getGameById(ano, Number(jogoId));
  if (!game) return null;

  const ratings = await recalcRatingsFromSeason(ano);
  const homeId = Number(game.mandante?.id);
  const awayId = Number(game.visitante?.id);
  const homeRating = (ratings.get(homeId) || { rating: 1500 }).rating;
  const awayRating = (ratings.get(awayId) || { rating: 1500 }).rating;

  const probs = expectedFromRatings(homeRating, awayRating);
  return { game, probs, homeRating, awayRating };
}

/**
 * Predict full rodada
 */
export async function predictRodada(ano = "2025", rodada) {
  const games = await getGamesByRodada(ano, rodada);
  const ratings = await recalcRatingsFromSeason(ano);
  const out = [];
  for (const g of games) {
    const homeId = Number(g.mandante?.id);
    const awayId = Number(g.visitante?.id);
    const homeRating = (ratings.get(homeId) || { rating: 1500 }).rating;
    const awayRating = (ratings.get(awayId) || { rating: 1500 }).rating;
    const probs = expectedFromRatings(homeRating, awayRating);
    out.push({ game: g, probs, homeRating, awayRating });
  }
  return out;
}
