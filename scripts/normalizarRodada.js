// scripts/normalizarRodada.js
export function normalizarRodada(bruto) {
  if (!Array.isArray(bruto) && bruto?.jogos) {
    // já vem no formato {grupos:..., jogos:...} ou similar
    bruto = bruto.jogos || bruto;
  }

  // Se veio como array de grupos: pega o primeiro grupo com .jogo
  const grupo = Array.isArray(bruto) ? bruto[0] : bruto;
  const jogosRaw = (grupo && (grupo.jogo || grupo.jogos)) || [];

  const rodadaNum = jogosRaw.length > 0 ? Number(jogosRaw[0].rodada || jogosRaw[0].rodada) : null;

  const jogos = jogosRaw.map(j => ({
    id: Number(j.id_jogo ?? j.id),
    num_jogo: Number(j.num_jogo ?? j.num_jogo),
    rodada: rodadaNum,
    grupo: j.grupo || null,
    mandante_id: j.mandante?.id ? Number(j.mandante.id) : null,
    visitante_id: j.visitante?.id ? Number(j.visitante.id) : null,
    mandante: j.mandante?.nome || null,
    visitante: j.visitante?.nome || null,
    estadio: (j.local || "").trim() || null,
    data: (j.data || "").trim() || null,
    hora: (j.hora || "").trim() || null,
    gols_mandante: j.mandante?.gols ? Number(j.mandante.gols) : null,
    gols_visitante: j.visitante?.gols ? Number(j.visitante.gols) : null,
    documentos: j.documentos || [],
    arbitros: j.arbitros || []
  }));

  return { rodada: rodadaNum, jogos };
}
