// scraper/cbfJogos.js
import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeTeam } from "../normalizeTeam.js";

const URL = "https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2025";

function cleanText(t) {
  return (t || "").replace(/\s+/g, " ").trim();
}

export async function obterJogosCBF() {
  try {
    const { data: html } = await axios.get(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(html);

    const rodadas = [];

    // 1) Tenta capturar seções tipo "Rodada X" contendo listas de jogos
    $("section, .rodada, .matches, .box-jogos, .partidas").each((_, sec) => {
      const secText = cleanText($(sec).text()).toLowerCase();
      if (!/rodada|rodadas|jogos/.test(secText)) return;

      // tenta extrair número da rodada no título
      const titulo = cleanText($(sec).find("h2, h3, .title, .rodada-title").first().text() || "");
      const rodadaNumMatch = titulo.match(/(\d{1,3})/);
      const rodadaNum = rodadaNumMatch ? Number(rodadaNumMatch[1]) : null;

      const jogos = [];
      // procura linhas de jogos na seção
      $(sec).find("li, .match, .partida, .jogo, .row").each((_, li) => {
        const text = cleanText($(li).text());
        if (!text) return;
        // tenta extrair mandante e visitante através de padrão "TIME X TIME" ou "TIME X TIME - data"
        const parts = text.split(/\s+x\s+/i);
        if (parts.length >= 2) {
          const mandNome = cleanText(parts[0].replace(/\d{1,2}:\d{2}.*/i, ""));
          const rest = parts[1].replace(/.*?(?= [0-9]{1,2}[:ªó])/i, parts[1]); // tentativa
          // retirar placar se houver (ex: "SPO 2 X 4 ATL")
          const visitanteRaw = parts[1].split(/\s+/).slice(0, 3).join(" ");
          const visitanteNome = cleanText(visitanteRaw.replace(/\d+/g, "").replace(/[:\-\–]/g, ""));
          jogos.push({ mandante: mandNome, visitante: visitanteNome });
        } else {
          // fallback: tentar pegar elementos com data-team attributes ou spans
          const mand = cleanText($(li).find(".home, .mandante, .time-mandante, .time-home").text());
          const vis  = cleanText($(li).find(".away, .visitante, .time-visitante, .time-away").text());
          if (mand && vis) jogos.push({ mandante: mand, visitante: vis });
        }
      });

      if (jogos.length) {
        rodadas.push({ rodada: rodadaNum || null, jogos });
      }
    });

    // 2) Se não encontrou nada, tenta capturar a sidebar de "Jogos" (layout conhecido)
    if (!rodadas.length) {
      const sidebar = $(".rodada-box, .jogos-lateral, .sidebar-matches, .matches-sidebar");
      if (sidebar.length) {
        sidebar.each((_, box) => {
          const rodadaTitle = cleanText($(box).find("h3, h4, .rodada-title").first().text() || "");
          const rodadaNumMatch = rodadaTitle.match(/(\d{1,3})/);
          const rodadaNum = rodadaNumMatch ? Number(rodadaNumMatch[1]) : null;
          const jogos = [];
          $(box).find(".match, .item, li").each((_, it) => {
            const mand = cleanText($(it).find(".home, .team-home, .team-mandante").text() || $(it).find(".team:first-child").text());
            const vis = cleanText($(it).find(".away, .team-away, .team-visitante").text() || $(it).find(".team:nth-child(2)").text());
            if (mand && vis) jogos.push({ mandante: mand, visitante: vis });
          });
          if (jogos.length) rodadas.push({ rodada: rodadaNum || null, jogos });
        });
      }
    }

    // 3) Normalizar nomes usando normalizeTeam
    for (const r of rodadas) {
      for (const j of r.jogos) {
        try {
          const m = await normalizeTeam(j.mandante);
          const v = await normalizeTeam(j.visitante);
          j.mandante = m ? m.id : j.mandante;
          j.visitante = v ? v.id : j.visitante;
        } catch (e) {
          console.warn("Erro ao normalizar jogo:", j, e);
        }
      }
    }

    return rodadas;
  } catch (error) {
    console.error("ERRO AO COLETAR JOGOS DA CBF:", error.message || error);
    return null;
  }
}
