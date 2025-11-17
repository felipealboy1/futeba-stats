// scripts/inspectCache.js
// Usa Node para inspecionar o cache gerado e imprimir resumo.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CACHE = path.join(ROOT, "dados", "cache", "projecao_2025_10000.json");

function readSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; }
}

const j = readSafe(CACHE);
if (!j) {
  console.error("Cache não encontrado em", CACHE);
  process.exit(1);
}

console.log("Cache carregado:", CACHE);
console.log("nSim:", j.nSim || "—");
const times = j.times || {};
const arr = Object.values(times).map(t => ({ id: t.id, nome: t.nome, probTitulo: t.probTitulo, probG4: t.probG4, probG6: t.probG6, probRebaixamento: t.probRebaixamento, posMedia: t.posMedia }));
arr.sort((a,b)=> (b.probTitulo||0) - (a.probTitulo||0));
console.log("Top 10 por probTitulo:");
for (let i=0;i<Math.min(10,arr.length);i++){
  const t = arr[i];
  console.log(`${i+1}. ${t.nome} — Título ${ (t.probTitulo*100).toFixed(2)}% — G4 ${ (t.probG4*100).toFixed(2)}% — G6 ${(t.probG6*100).toFixed(2)}% — Reba ${(t.probRebaixamento*100).toFixed(2)}% — posMedia ${t.posMedia}`);
}

// checar se alguma prob é exatamente 0 ou 1
const exact1 = Object.values(times).filter(t => t.probTitulo === 1 || t.probG4 === 1 || t.probG6 === 1 || t.probRebaixamento === 1);
const exact0 = Object.values(times).filter(t => t.probTitulo === 0 && t.probG4 === 0 && t.probG6 === 0 && t.probRebaixamento === 0);
console.log("Times com prob exatamente 1 em alguma métrica:", exact1.map(x=>x.nome));
console.log("Times com todas probs exatamente 0:", exact0.map(x=>x.nome));
