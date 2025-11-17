import fs from "fs";
import * as cheerio from "cheerio";

const URL =
  "https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2025";

async function scrapeClassificacao() {
  console.log("🔄 Baixando HTML da CBF...");

  const resposta = await fetch(URL);
  const html = await resposta.text();

  const $ = cheerio.load(html);

  console.log("📄 HTML carregado. Extraindo dados...");

  const linhas = $("table tbody tr");
  const times = [];

  linhas.each((_, linha) => {
    const tds = $(linha).find("td");

    if (tds.length < 12) return; // proteção

    // Posição
    const pos = parseInt($(tds[0]).find("strong").first().text().trim());

    // URL e ID do time
    const link = $(tds[0]).find("a").attr("href");
    const partes = link.split("/");
    const id = parseInt(partes[partes.length - 1]);

    // Nome
    const nome = $(tds[0]).find("strong").last().text().trim();

    times.push({
      pos,
      id,
      nome,
      pontos: parseInt($(tds[1]).text().trim()),
      jogos: parseInt($(tds[2]).text().trim()),
      vitorias: parseInt($(tds[3]).text().trim()),
      empates: parseInt($(tds[4]).text().trim()),
      derrotas: parseInt($(tds[5]).text().trim()),
      golsPro: parseInt($(tds[6]).text().trim()),
      golsContra: parseInt($(tds[7]).text().trim()),
      saldo: parseInt($(tds[8]).text().trim()),
      amarelos: parseInt($(tds[9]).text().trim()),
      vermelhos: parseInt($(tds[10]).text().trim()),
      aproveitamento: parseInt($(tds[11]).text().trim()),
    });
  });

  console.log("📦 Salvando JSON...");

  const outputPath = "./dados/classificacao/serieA2025.json";

  fs.writeFileSync(outputPath, JSON.stringify(times, null, 2), "utf-8");

  console.log("✅ Arquivo criado!");
  console.log(outputPath);
}

scrapeClassificacao().catch((err) => {
  console.error("❌ Erro no scraper:", err);
});
