// scripts/debugSim.js
// Execute para rodar simulateSeason com nSim pequeno (ex.: 200) e logs.

import { simulateSeason } from "../models/simulacao.js";

async function main() {
  console.log("Rodando simulateSeason debug (nSim=200) ...");
  process.env.DEBUG_SIM = "1"; // ativa logs dentro do módulo se implementado
  const res = await simulateSeason({ ano: "2025", nSim: 200 });
  console.log("Resumo:");
  const arr = Object.values(res.times).map(t => ({ id: t.id, nome: t.nome, probTitulo: t.probTitulo, posMedia: t.posMedia })).sort((a,b)=>b.probTitulo-a.probTitulo);
  for (let i=0;i<Math.min(10,arr.length);i++){
    const t = arr[i];
    console.log(`${i+1}. ${t.nome} — Título ${(t.probTitulo*100).toFixed(2)}% — posMedia ${t.posMedia}`);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
