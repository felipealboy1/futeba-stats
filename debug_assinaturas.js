import fs from "fs";
import { getAllGames } from "./services/games.js";

async function run() {
  const ano = "2025";

  // 1) JOGOS ATUAIS
  const jogosAtuais = await getAllGames(ano);

  const assinaturaAtualLista = jogosAtuais
    .filter(j => j.officialFinalized === true)
    .map(j => `${j.rodada}:${j.mandante.nome}:${j.visitante.nome}:${j.gols_mandante} x ${j.gols_visitante}`);

  // 2) JOGOS NO CACHE
  const cache = JSON.parse(fs.readFileSync("./dados/cache/rodadas_2025.json", "utf8"));

  const assinaturaCacheLista = cache.flatMap(r =>
    r.jogos
      .filter(j => j.tipo === "real")
      .map(j => `${r.rodada}:${j.mandante}:${j.visitante}:${j.placar}`)
  );

  console.log("===================================================");
  console.log("ASSINATURA ATUAL (jogos reais normalizados)");
  console.log("===================================================");
  assinaturaAtualLista.forEach(l => console.log(l));

  console.log("\n===================================================");
  console.log("ASSINATURA CACHE (jogos reais salvos no cache)");
  console.log("===================================================");
  assinaturaCacheLista.forEach(l => console.log(l));

  console.log("\n===================================================");
  console.log("DIFERENÇAS ENCONTRADAS");
  console.log("===================================================");

  const setAtual = new Set(assinaturaAtualLista);
  const setCache = new Set(assinaturaCacheLista);

  const somenteNoAtual = assinaturaAtualLista.filter(x => !setCache.has(x));
  const somenteNoCache = assinaturaCacheLista.filter(x => !setAtual.has(x));

  console.log("\n>> SOMENTE NO ATUAL:");
  somenteNoAtual.forEach(l => console.log(l));

  console.log("\n>> SOMENTE NO CACHE:");
  somenteNoCache.forEach(l => console.log(l));
}

run().catch(err => console.error(err));
