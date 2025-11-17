#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { normalizeRodada } from "../normalizers/normalizarJogos.js";
import { normalizeClassificacaoRodada } from "../normalizers/normalizarClassificacao.js";

function parseArgs(argv) {
  const args = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      args[k] = v ?? true;
    }
  }
  return args;
}

async function listRodadas(ano, base) {
  try {
    const files = await fs.readdir(path.join(base, ano));
    return files
      .map(f => Number(f.match(/rodada_(\d+)/)?.[1]))
      .filter(Boolean)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ano = args.ano || "2025";

  if (args.classificacao) {
    const rodadas = await listRodadas(ano, "dados/classificacao");
    for (const r of rodadas) await normalizeClassificacaoRodada(ano, r);
    return;
  }

  if (args.todas) {
    const rodadas = await listRodadas(ano, "dados/jogos");
    if (!rodadas.length) {
      console.log("Nenhuma rodada encontrada em dados/jogos/" + ano);
      return;
    }
    for (const r of rodadas) {
      await normalizeRodada(ano, r);
    }
    return;
  }

  if (args.rodada) {
    await normalizeRodada(ano, args.rodada);
    return;
  }

  console.log("Uso: --ano=YYYY --rodada=N | --todas | --classificacao");
}

main();
