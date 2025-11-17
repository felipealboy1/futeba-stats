// models/simulacao.js
// Simulação da temporada com cache e correção de mapeamento de IDs (usa IDs que aparecem nos jogos).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { getAllGames } from "../services/games.js";
import { getAllTimes } from "../services/times.js";
import { predictGameById } from "./predict.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "dados", "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// limites de posições
const POS_LIBERTADORES_MAX = 4;
const POS_G6_MAX = 6;
const POS_SULAMERICANA_MIN = 7;
const POS_SULAMERICANA_MAX = 12;
const POS_REBAIXAMENTO_MIN = 17;

function sampleOutcome(probs, r = Math.random()) {
  const h = Number(probs.home || 0);
  const d = Number(probs.draw || 0);
  if (r < h) return 0;
  if (r < h + d) return 1;
  return 2;
}

function generateScoreForOutcome(outcome, r = Math.random()) {
  if (outcome === 0) {
    return [1 + (r < 0.45 ? 1 : 0), Math.random() < 0.12 ? 1 : 0];
  } else if (outcome === 2) {
    return [Math.random() < 0.12 ? 1 : 0, 1 + (r < 0.45 ? 1 : 0)];
  } else {
    const g = r < 0.5 ? 0 : 1;
    return [g, g];
  }
}

function ordenarTabelaArray(arr) {
  arr.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return String(a.nome || "").localeCompare(String(b.nome || ""));
  });
  return arr;
}

function readSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function writeSafe(p, obj) {
  try {
    fs.writeFileSync(p + ".tmp", JSON.stringify(obj, null, 2));
    fs.renameSync(p + ".tmp", p);
  } catch (err) {
    console.error("Erro escrevendo cache:", p, err.message || err);
  }
}

function loadPrecalcProbs(ano) {
  const p = path.join(CACHE_DIR, `probs_${ano}.json`);
  const j = readSafe(p);
  return j || {};
}

export async function simulateSeason({ ano = "2025", nSim = 10000 } = {}) {
  // DEBUG à chamada permite ativar logs com DEBUG_SIM=1
  const DEBUG = process.env.DEBUG_SIM === "1";

  const cacheFile = path.join(CACHE_DIR, `projecao_${ano}_${nSim}.json`);
  const cached = readSafe(cacheFile);
  if (cached) {
    if (DEBUG) console.log("⚡ simulateSeason: usando cache", cacheFile);
    return cached;
  }
  if (DEBUG) console.log("⏳ simulateSeason: cache não encontrado — calculando...");

  // 1) carregar dados
  const allGames = await getAllGames(ano);
  let timesList = [];
  try { timesList = await getAllTimes(); } catch (e) { /* fallback abaixo */ }

  if (!Array.isArray(allGames)) {
    throw new Error("getAllGames retornou valor inesperado (não-array).");
  }

  // 2) construir conjunto de teamIds usando TWO SOURCES:
  //    - timesList (se existir) e
  //    - ids que aparecem nos jogos (homeId/awayId)
  const teamIdSet = new Set();
  const teamInfoById = {};

  // a) partir do arquivo de times (se disponível)
  if (Array.isArray(timesList) && timesList.length > 0) {
    for (const t of timesList) {
      const tid = Number(t.id);
      if (!Number.isFinite(tid)) continue;
      teamIdSet.add(tid);
      teamInfoById[tid] = { id: tid, nome: t.nome || `Time ${tid}`, escudo: t.escudo || null };
    }
  }

  // b) garantir ids vindos dos jogos (usa home/away ids reais)
  for (const g of allGames) {
    const hid = Number(g?.mandante?.id);
    const aid = Number(g?.visitante?.id);
    if (Number.isFinite(hid)) {
      if (!teamIdSet.has(hid)) {
        // adicionar e tomar nome do jogo se não tivermos info
        teamIdSet.add(hid);
        teamInfoById[hid] = { id: hid, nome: g?.mandante?.nome || `Time ${hid}` };
      }
    }
    if (Number.isFinite(aid)) {
      if (!teamIdSet.has(aid)) {
        teamIdSet.add(aid);
        teamInfoById[aid] = { id: aid, nome: g?.visitante?.nome || `Time ${aid}` };
      }
    }
  }

  const teamIds = Array.from(teamIdSet).map(x => Number(x));
  if (DEBUG) {
    console.log("simulateSeason: times detectados (union):", teamIds.length);
    console.log("simulateSeason: jogos detectados:", allGames.length);
  }

  // 3) carregar probs pré-calculadas
  const preProbs = loadPrecalcProbs(ano);
  if (DEBUG) console.log("simulateSeason: probs pré-carregadas:", Object.keys(preProbs).length);

  // 4) preparar jogos
  const gamesPrepared = allGames.map((g) => {
    const gid = String(g.id || g.id_jogo || g.num_jogo || "");
    const homeId = Number(g?.mandante?.id || -1);
    const awayId = Number(g?.visitante?.id || -1);
    return {
      id: gid,
      homeId,
      awayId,
      homeName: g?.mandante?.nome || "",
      awayName: g?.visitante?.nome || "",
      golsH: (typeof g.gols_mandante !== "undefined" && g.gols_mandante !== null) ? Number(g.gols_mandante) : null,
      golsA: (typeof g.gols_visitante !== "undefined" && g.gols_visitante !== null) ? Number(g.gols_visitante) : null,
      finalized: Boolean(g.officialFinalized),
      probs: (gid && preProbs[gid]) ? preProbs[gid] : null
    };
  });

  // stats iniciais
  const totalPrepared = gamesPrepared.length;
  const haveProbs = gamesPrepared.filter(x => x.probs).length;
  const finalizedWithScore = gamesPrepared.filter(x => x.finalized && x.golsH !== null && x.golsA !== null).length;
  if (DEBUG) {
    console.log("simulateSeason: jogos preparados:", totalPrepared, "com probs:", haveProbs, "finalizados c/ placar:", finalizedWithScore);
    console.log("simulateSeason: exemplos gamesPrepared (até 8):", gamesPrepared.slice(0,8).map(g => ({ id: g.id, homeId: g.homeId, awayId: g.awayId, finalized: g.finalized, golsH: g.golsH, golsA: g.golsA, hasProbs: !!g.probs })));
  }

  // 5) preencher probs faltantes com predictGameById (uma vez por jogo)
  const missing = gamesPrepared.filter(g => !g.probs);
  if (missing.length > 0) {
    if (DEBUG) console.log("simulateSeason: buscando probs para", missing.length, "jogos sem probs...");
    for (const mg of missing) {
      const numericId = Number(mg.id) || undefined;
      if (numericId) {
        try {
          const p = await predictGameById(ano, numericId);
          mg.probs = (p && p.probs) ? p.probs : { home: 0.33, draw: 0.34, away: 0.33 };
        } catch (e) {
          mg.probs = { home: 0.33, draw: 0.34, away: 0.33 };
        }
      } else {
        mg.probs = { home: 0.33, draw: 0.34, away: 0.33 };
      }
    }
    if (DEBUG) console.log("simulateSeason: preenchimento de probs concluído.");
  }

  // 6) preparar estruturas de agregação (counts)
  const maxPos = Math.max(20, teamIds.length);
  const countsByTeam = {};
  for (const id of teamIds) {
    countsByTeam[String(id)] = {
      id,
      nome: teamInfoById[id]?.nome || `Time ${id}`,
      posCounts: new Array(maxPos + 1).fill(0),
      sumPos: 0,
      minPos: Infinity,
      maxPos: -Infinity,
      championCount: 0,
      g4Count: 0,
      g6Count: 0,
      sulCount: 0,
      relegCount: 0
    };
  }

  // 7) loop de simulação
  const nTeams = teamIds.length;
  const teamBuffer = new Array(nTeams);

  for (let sim = 0; sim < nSim; sim++) {
    const classif = {};

    for (let gi = 0; gi < gamesPrepared.length; gi++) {
      const g = gamesPrepared[gi];

      if (g.finalized && g.golsH !== null && g.golsA !== null) {
        const gh = Number(g.golsH);
        const ga = Number(g.golsA);
        if (!classif[g.homeId]) classif[g.homeId] = { id: g.homeId, nome: g.homeName, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
        if (!classif[g.awayId]) classif[g.awayId] = { id: g.awayId, nome: g.awayName, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };

        const H = classif[g.homeId];
        const A = classif[g.awayId];

        H.j++; A.j++;
        H.gp += gh; H.gc += ga; H.sg = H.gp - H.gc;
        A.gp += ga; A.gc += gh; A.sg = A.gp - A.gc;

        if (gh > ga) { H.v++; H.pts += 3; A.d++; }
        else if (ga > gh) { A.v++; A.pts += 3; H.d++; }
        else { H.e++; A.e++; H.pts++; A.pts++; }

        continue;
      }

      // simular pelo probs
      const probs = g.probs || { home: 0.33, draw: 0.34, away: 0.33 };
      const outcome = sampleOutcome(probs, Math.random());
      const [sH, sA] = generateScoreForOutcome(outcome, Math.random());

      if (!classif[g.homeId]) classif[g.homeId] = { id: g.homeId, nome: g.homeName, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
      if (!classif[g.awayId]) classif[g.awayId] = { id: g.awayId, nome: g.awayName, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };

      const H2 = classif[g.homeId];
      const A2 = classif[g.awayId];

      H2.j++; A2.j++;
      H2.gp += sH; H2.gc += sA; H2.sg = H2.gp - H2.gc;
      A2.gp += sA; A2.gc += sH; A2.sg = A2.gp - A2.gc;

      if (sH > sA) { H2.v++; H2.pts += 3; A2.d++; }
      else if (sA > sH) { A2.v++; A2.pts += 3; H2.d++; }
      else { H2.e++; A2.e++; H2.pts++; A2.pts++; }
    }

    // garantir todos os times
    let idx = 0;
    for (const id of teamIds) {
      if (!classif[id]) {
        const info = teamInfoById[id] || { nome: `Time ${id}` };
        classif[id] = { id, nome: info.nome, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
      }
      teamBuffer[idx++] = classif[id];
    }

    const tabela = ordenarTabelaArray(teamBuffer.slice(0, idx));

    for (let pIndex = 0; pIndex < tabela.length; pIndex++) {
      const pos = pIndex + 1;
      const rec = tabela[pIndex];
      const key = String(rec.id);
      let t = countsByTeam[key];
      if (!t) {
        // deve ser raro, mas inicializa se necessário
        t = {
          id: rec.id,
          nome: rec.nome,
          posCounts: new Array(maxPos + 1).fill(0),
          sumPos: 0,
          minPos: Infinity,
          maxPos: -Infinity,
          championCount: 0,
          g4Count: 0,
          g6Count: 0,
          sulCount: 0,
          relegCount: 0
        };
        countsByTeam[key] = t;
      }

      t.posCounts[pos] = (t.posCounts[pos] || 0) + 1;
      t.sumPos += pos;
      if (pos < t.minPos) t.minPos = pos;
      if (pos > t.maxPos) t.maxPos = pos;
      if (pos === 1) t.championCount++;
      if (pos <= POS_LIBERTADORES_MAX) t.g4Count++;
      if (pos <= POS_G6_MAX) t.g6Count++;
      if (pos >= POS_SULAMERICANA_MIN && pos <= POS_SULAMERICANA_MAX) t.sulCount++;
      if (pos >= POS_REBAIXAMENTO_MIN) t.relegCount++;
    }

    teamBuffer.fill(undefined, 0, idx);
  } // end sim loop

  // 8) montar saída
  const timesOut = {};
  const championProb = {};

  for (const id of teamIds) {
    const rec = countsByTeam[String(id)];
    const tot = nSim;
    const dist = {};
    for (let p = 1; p <= maxPos; p++) dist[String(p)] = rec.posCounts[p] || 0;

    const posMedia = rec.sumPos / Math.max(1, tot);
    const out = {
      id: rec.id,
      nome: rec.nome,
      probTitulo: (rec.championCount || 0) / tot,
      probG4: (rec.g4Count || 0) / tot,
      probG6: (rec.g6Count || 0) / tot,
      probSulAmericana: (rec.sulCount || 0) / tot,
      probRebaixamento: (rec.relegCount || 0) / tot,
      posMedia: Number(posMedia.toFixed(3)),
      posMin: isFinite(rec.minPos) ? rec.minPos : null,
      posMax: rec.maxPos > -Infinity ? rec.maxPos : null,
      distPosicoes: dist
    };
    timesOut[String(rec.id)] = out;
    championProb[String(rec.id)] = out.probTitulo;
  }

  const result = { nSim, times: timesOut, championProb };

  writeSafe(cacheFile, result);
  if (DEBUG) console.log("simulateSeason: cache gravado em", cacheFile);

  return result;
}
