import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CAMPEONATO = JSON.parse(
  fs.readFileSync(path.resolve("config/campeonato.json"), "utf8")
);

const BASE = "https://www.cbf.com.br/api/proxy?path=";

// headers iguais aos do navegador
const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json",
  "Referer": `https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/${CAMPEONATO.ano}`
};

async function rodadaExiste(num) {
  const url = `${BASE}/jogos/campeonato/${CAMPEONATO.id}/rodada/${num}/fase`;

  try {
    const resp = await fetch(url, { headers: HEADERS });
    const json = await resp.json();

    // existe rodada se houver jogos dentro de: json.jogos[0].jogo[]
    const jogos = json?.jogos?.[0]?.jogo;

    return Array.isArray(jogos) && jogos.length > 0;
  } catch {
    return false;
  }
}

async function detectarRodadas() {
  console.log("📡 Detectando rodadas por tentativa…");

  const rodadas = [];

  // máximo possível para segurança
  for (let r = 1; r <= 60; r++) {
    const existe = await rodadaExiste(r);

    if (existe) {
      console.log(`➡ Rodada ${r} encontrada`);
      rodadas.push(r);
    } else {
      console.log(`❌ Rodada ${r} NÃO existe — parando`);
      break;
    }
  }

  if (rodadas.length === 0) {
    console.log("⚠ Não encontrei nenhuma rodada!");
    return;
  }

  const saida = "dados/rodadas.json";
  fs.writeFileSync(saida, JSON.stringify(rodadas, null, 2));
  console.log("✅ Rodadas salvas em:", saida);
}

detectarRodadas();
