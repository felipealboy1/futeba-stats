// services/classificacao.js
import fs from "fs";
import path from "path";
import { getAllGames } from "./games.js";
import { normalizarTime } from "./normalizarTime.js";

/**
 * Classificação Oficial (versão local)
 *
 * Nesta versão (Opção A):
 * - SEM chamadas externas (CBF removida)
 * - SEM cache em memória
 * - Sempre recalcula a classificação com base nos jogos atualizados
 * - O pipeline atualiza os jogos/rodadas, então a tabela reflete isso automaticamente
 */

// ---------------------------
// Cálculo da tabela local
// ---------------------------
function computeClassificationFromGames(games) {
  const map = new Map();

  function ensure(id, nome) {
    const key = Number(id);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        nome: normalizarTime(nome),
        pts: 0, j: 0, v: 0, e: 0, d: 0,
        gp: 0, gc: 0, sg: 0,
      });
    }
    return map.get(key);
  }

  for (const g of games) {
    if (!g.officialFinalized) continue;

    const hid = Number(g.mandante?.id);
    const aid = Number(g.visitante?.id);

    const H = ensure(hid, g.mandante?.nome);
    const A = ensure(aid, g.visitante?.nome);

    const gH = Number(g.gols_mandante || 0);
    const gA = Number(g.gols_visitante || 0);

    H.j++; 
    A.j++;

    H.gp += gH; 
    H.gc += gA; 
    H.sg = H.gp - H.gc;

    A.gp += gA; 
    A.gc += gH; 
    A.sg = A.gp - A.gc;

    if (gH > gA) { 
      H.v++; 
      H.pts += 3; 
      A.d++; 
    }
    else if (gA > gH) { 
      A.v++; 
      A.pts += 3; 
      H.d++; 
    }
    else { 
      H.e++; 
      A.e++; 
      H.pts++; 
      A.pts++; 
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      if (b.gp !== a.gp) return b.gp - a.gp;
      return a.nome.localeCompare(b.nome);
    });
}

// ---------------------------
// Função principal (usada pelo backend)
// ---------------------------
export async function getClassificacaoOfficial(ano = "2025") {
  try {
    const games = await getAllGames(ano);

    const computed = computeClassificationFromGames(games);

    return computed.map((t, i) => ({
      position: i + 1,
      ...t,
    }));
  } catch (err) {
    console.error("Erro ao calcular classificacao local:", err);
    return [];
  }
}
