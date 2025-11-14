// testarScraperJogos.js
import { obterJogosCBF } from "./scrapers/cbfJogos.js";

(async () => {
  const rodadas = await obterJogosCBF();
  console.log("JOGOS COLETADOS:", JSON.stringify(rodadas, null, 2));
})();
