// models/simulacaoRodadas.js — VERSÃO PROFISSIONAL

import { getGamesByRodada } from "../services/games.js";
import { listRodadas } from "../services/rodadas.js";
import { predictRodada } from "./predict.js";

function sampleOutcome(probs) {
  const r = Math.random();
  if (r < probs.home) return "home";
  if (r < probs.home + probs.draw) return "draw";
  return "away";
}

function aplicarResultado(classif, idH, nomeH, idA, nomeA, gH, gA) {
  if (!classif.has(idH)) classif.set(idH, { id: idH, nome: nomeH, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 });
  if (!classif.has(idA)) classif.set(idA, { id: idA, nome: nomeA, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 });

  const H = classif.get(idH);
  const A = classif.get(idA);

  H.j++; A.j++;
  H.gp += gH; H.gc += gA; H.sg = H.gp - H.gc;
  A.gp += gA; A.gc += gH; A.sg = A.gp - A.gc;

  if (gH > gA) { H.v++; H.pts += 3; A.d++; }
  else if (gA > gH) { A.v++; A.pts += 3; H.d++; }
  else { H.e++; A.e++; H.pts++; A.pts++; }
}

function ordenar(classif) {
  return [...classif.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.nome.localeCompare(b.nome);
  });
}

export async function simularRodadas(ano = "2025", simPorJogo = 500) {

  const rodadas = await listRodadas(ano);
  const saida = [];
  const classif = new Map();

  for (const rodada of rodadas) {
    const jogos = await getGamesByRodada(ano, rodada);
    const reais = jogos.filter(j => j.status === "FINALIZADO");
    const pendentes = jogos.filter(j => j.status !== "FINALIZADO");

    const jogosRodada = [];

    // aplicar jogos reais
    for (const j of reais) {
      aplicarResultado(
        classif,
        j.mandante.id, j.mandante.nome,
        j.visitante.id, j.visitante.nome,
        Number(j.gols_mandante),
        Number(j.gols_visitante)
      );

      jogosRodada.push({
        mandante: j.mandante.nome,
        visitante: j.visitante.nome,
        placar: `${j.gols_mandante} x ${j.gols_visitante}`,
        tipo: "real",
      });
    }

    // previsões da rodada
    const preds = await predictRodada(ano, rodada);

    // simular jogos pendentes
    for (const j of pendentes) {
      const pred = preds.find(p => Number(p.game.id) === Number(j.id));
      const probs = pred?.probs || { home: 0.33, draw: 0.34, away: 0.33 };

      let homeWins = 0;
      let awayWins = 0;
      let draws = 0;

      // simulação múltipla
      for (let s = 0; s < simPorJogo; s++) {
        const o = sampleOutcome(probs);
        if (o === "home") homeWins++;
        else if (o === "away") awayWins++;
        else draws++;
      }

      // simulação final para classificação
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

      aplicarResultado(
        classif,
        j.mandante.id, j.mandante.nome,
        j.visitante.id, j.visitante.nome,
        gH, gA
      );

      jogosRodada.push({
        mandante: j.mandante.nome,
        visitante: j.visitante.nome,
        placar: `${gH} x ${gA}`,
        tipo: "simulado",
        sims: {
          home: homeWins,
          away: awayWins,
          draw: draws,
          total: simPorJogo
        }
      });
    }

    // classificação após a rodada
    saida.push({
      rodada,
      jogos: jogosRodada,
      classificacao: ordenar(classif)
    });
  }

  return saida;
}
