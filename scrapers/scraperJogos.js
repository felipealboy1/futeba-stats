import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CAMPEONATO = JSON.parse(
  fs.readFileSync(path.resolve("config/campeonato.json"), "utf8")
);

const BASE = "https://www.cbf.com.br/api/proxy?path=";

const rodadaArg = process.argv.find(arg => arg.startsWith("--rodada="));
const rodada = rodadaArg ? Number(rodadaArg.split("=")[1]) : null;

if (!rodada) {
  console.log("❌ Você precisa informar a rodada. Exemplo:");
  console.log("npm run scrape:jogos -- --rodada=33");
  process.exit(1);
}

async function baixarRodada() {
  try {
    const url = `${BASE}/jogos/campeonato/${CAMPEONATO.id}/rodada/${rodada}/fase`;

    console.log("📡 Buscando jogos da rodada", rodada);
    console.log("➡ URL:", url);

    const resp = await fetch(url);
    const data = await resp.json();

    // ---- FORMATO REAL ----
    const jogos =
      data?.jogos?.[0]?.jogo ??
      [];

    console.log(`📌 ${jogos.length} jogos encontrados!`);

    const pasta = `dados/jogos/${CAMPEONATO.ano}`;
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

    const arquivo = `${pasta}/rodada_${rodada}.json`;
    fs.writeFileSync(arquivo, JSON.stringify(jogos, null, 2));

    console.log("✅ Arquivo salvo:");
    console.log("➡", arquivo);

  } catch (e) {
    console.error("❌ Erro:", e.message);
  }
}

baixarRodada();
