// testarScraperTabela.js
import { obterTabelaCBF } from "./scrapers/cbfTabela.js";

(async () => {
  const tabela = await obterTabelaCBF();
  console.log("TABELA COLETADA:", JSON.stringify(tabela, null, 2));
})();
