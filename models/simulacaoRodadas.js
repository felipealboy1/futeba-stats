// models/simulacaoRodadas.js
import { getGamesByRodada } from "../services/games.js";
import { listRodadas } from "../services/rodadas.js";
import { predictRodada } from "./predict.js";

const SIMS_PER_GAME = 10000;

function sampleOutcome(probs) {
  const r = Math.random();
  if (r < probs.home) return "home";
  if (r < probs.home + probs.draw) return "draw";
  return "away";
}

function aplicarResultado(classif, idH, nomeH, idA, nomeA, gH, gA) {
  const hid = Number(idH);
  const aid = Number(idA);
  if (!Number.isFinite(hid) || !Number.isFinite(aid)) {
    // proteger: ids inválidos não devem quebrar a simulação
    // log leve para debug
    //console.warn("aplicarResultado ignorado por id inválido:", { idH, idA, nomeH, nomeA });
    return;
  }
  if (!classif.has(hid)) classif.set(hid, { id: hid, nome: nomeH, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 });
  if (!classif.has(aid)) classif.set(aid, { id: aid, nome: nomeA, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 });

  const H = classif.get(hid);
  const A = classif.get(aid);

  const GH = Number(gH || 0);
  const GA = Number(gA || 0);

  H.j++; A.j++;
  H.gp += GH; H.gc += GA; H.sg = H.gp - H.gc;
  A.gp += GA; A.gc += GH; A.sg = A.gp - A.gc;

  if (GH > GA) { H.v++; H.pts += 3; A.d++; }
  else if (GA > GH) { A.v++; A.pts += 3; H.d++; }
  else { H.e++; A.e++; H.pts++; A.pts++; }
}

function ordenar(classif) {
  return [...classif.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return String(a.nome).localeCompare(String(b.nome));
  });
}

export async function simularRodadas(ano = "2025", force = false) {
  const rodadas = await listRodadas(ano);
  const saida = [];
  const classif = new Map();

  for (const rodada of rodadas) {
    let jogos = [];
    try {
      jogos = await getGamesByRodada(ano, rodada) || [];
      if (!Array.isArray(jogos)) jogos = [];
    } catch (err) {
      console.error(`[simularRodadas] erro getGamesByRodada rodada ${rodada}:`, err && err.message);
      jogos = [];
    }

    // Se nenhum jogo foi retornado, logue e pule.
    if (!jogos || jogos.length === 0) {
      console.warn(`[simularRodadas] rodada ${rodada} não retornou jogos (vazio). Pulando.`);
      // empurra objeto com estrutura mínima para evitar undefined no frontend
      saida.push({ rodada, jogos: [], classificacao: ordenar(classif).map(t => ({ ...t })) });
      continue;
    }

    const reais = jogos.filter(j => j && (j.officialFinalized === true || String(j.status || "").toUpperCase().includes("FINAL")));
    const pendentes = jogos.filter(j => j && !(j.officialFinalized === true || String(j.status || "").toUpperCase().includes("FINAL")));

    const jogosRodada = [];

    for (const j of reais) {
      // proteção: validar campo mandante/visitante
      if (!j || !j.mandante || !j.visitante) {
        console.warn("[simularRodadas] jogo real inválido ignorado:", j && (j.id || j));
        continue;
      }
      const gH = Number(j.gols_mandante || 0);
      const gA = Number(j.gols_visitante || 0);

      aplicarResultado(classif, j.mandante.id, j.mandante.nome, j.visitante.id, j.visitante.nome, gH, gA);

      jogosRodada.push({
        mandante: j.mandante.nome,
        visitante: j.visitante.nome,
        placar: `${gH} x ${gA}`,
        tipo: "real"
      });
    }

    let preds = [];
    try { preds = await predictRodada(ano, rodada) || []; } catch (err) {
      console.warn(`[simularRodadas] predictRodada falhou rodada ${rodada}:`, err && err.message);
      preds = [];
    }

    for (const j of pendentes) {
      if (!j || !j.mandante || !j.visitante) {
        console.warn("[simularRodadas] jogo pendente inválido ignorado:", j && (j.id || j));
        continue;
      }

      const pred = preds.find(p => Number(p?.game?.id) === Number(j.id));
      const probs = pred?.probs || { home: 0.33, draw: 0.34, away: 0.33 };

      let homeWins = 0, awayWins = 0, draws = 0;

      for (let s = 0; s < SIMS_PER_GAME; s++) {
        const o = sampleOutcome(probs);
        if (o === "home") homeWins++;
        else if (o === "away") awayWins++;
        else draws++;
      }

      const finalOutcome = sampleOutcome(probs);
      let gH = 0, gA = 0;

      if (finalOutcome === "home") {
        gH = 1 + (Math.random() < 0.25 ? 1 : 0);
        gA = Math.random() < 0.1 ? 1 : 0;
      } else if (finalOutcome === "away") {
        gA = 1 + (Math.random() < 0.25 ? 1 : 0);
        gH = Math.random() < 0.1 ? 1 : 0;
      } else {
        gH = Math.random() < 0.5 ? 1 : 0;
        gA = gH;
      }

      aplicarResultado(classif, j.mandante.id, j.mandante.nome, j.visitante.id, j.visitante.nome, gH, gA);

      jogosRodada.push({
        mandante: j.mandante.nome,
        visitante: j.visitante.nome,
        placar: `${gH} x ${gA}`,
        tipo: "simulado",
        sims: {
          home: homeWins,
          draw: draws,
          away: awayWins,
          total: SIMS_PER_GAME
        }
      });
    }

    const tabela = ordenar(classif).map(t => ({ ...t }));
    saida.push({ rodada, jogos: jogosRodada, classificacao: tabela });
  }

  return saida;
}
