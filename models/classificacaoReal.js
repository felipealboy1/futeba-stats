// modelo profissional de classificação real
import { getAllGames } from "../services/games.js";

export async function classificacaoReal(ano = "2025") {
  const jogos = await getAllGames(ano);

  const reais = jogos.filter(j => j.status === "FINALIZADO");

  const tabela = new Map();

  function init(id, nome) {
    if (!tabela.has(id)) {
      tabela.set(id, {
        id, nome,
        pts: 0, j: 0, v: 0, e: 0, d: 0,
        gp: 0, gc: 0, sg: 0
      });
    }
  }

  for (const j of reais) {
    const hid = j.mandante.id;
    const aid = j.visitante.id;

    init(hid, j.mandante.nome);
    init(aid, j.visitante.nome);

    const H = tabela.get(hid);
    const A = tabela.get(aid);

    const gH = Number(j.gols_mandante);
    const gA = Number(j.gols_visitante);

    H.j++; A.j++;
    H.gp += gH; H.gc += gA;
    A.gp += gA; A.gc += gH;
    H.sg = H.gp - H.gc;
    A.sg = A.gp - A.gc;

    if (gH > gA) { H.v++; H.pts += 3; A.d++; }
    else if (gA > gH) { A.v++; A.pts += 3; H.d++; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
  }

  const ordenada = [...tabela.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.nome.localeCompare(b.nome);
  });

  return ordenada;
}
