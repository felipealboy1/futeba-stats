// frontend/src/services/api.js

const API =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "https://SEU_BACKEND_PUBLICO";


export async function getTimes() {
  const res = await fetch(`${API}/times`);
  return res.ok ? res.json() : [];
}

export async function getProjecaoCampeonato() {
  const res = await fetch(`${API}/projecao/campeonato`);
  return res.ok ? res.json() : null;
}

export async function getClassificacaoOfficial() {
  const res = await fetch(`${API}/classificacao/official`);
  return res.ok ? res.json() : [];
}

export async function getSimulacaoRodadas() {
  const res = await fetch(`${API}/simulacao/rodadas`);
  return res.ok ? res.json() : [];
}
