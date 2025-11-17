import fs from "fs";

export function normalizarRodada(rodadaBruta) {
  if (!rodadaBruta?.length) return null;

  const grupo = rodadaBruta[0];
  const jogos = grupo.jogo || [];

  const rodada = jogos.length > 0 ? Number(jogos[0].rodada) : null;

  return {
    rodada,
    jogos: jogos.map(j => ({
      id: Number(j.id_jogo),
      mandante_id: Number(j.mandante.id),
      visitante_id: Number(j.visitante.id),
      mandante: j.mandante.nome,
      visitante: j.visitante.nome,
      estadio: j.local || null,
      data: j.data?.trim() || null,
      hora: j.hora?.trim() || null,
      gols_mandante: j.mandante.gols ? Number(j.mandante.gols) : null,
      gols_visitante: j.visitante.gols ? Number(j.visitante.gols) : null
    }))
  };
}
