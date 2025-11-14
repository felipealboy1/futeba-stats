// scraper/cbfTabela.js
import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeTeam } from "../normalizeTeam.js";

const URL = "https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2025";

export async function obterTabelaCBF() {
  try {
    const { data: html } = await axios.get(URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(html);
    const tabela = [];

    // Procura pela tabela principal — seletor genérico: table tbody tr
    $("table tbody tr").each((_, el) => {
      const cols = $(el).find("td");
      if (cols.length < 10) return; // ignora linhas inválidas

      const posText = $(cols[0]).text().trim();
      const nomeOriginal = $(cols[1]).text().trim();

      tabela.push({
        pos: parseInt(posText || "0", 10),
        nome: nomeOriginal,
        id: null,
        pontos: parseInt($(cols[2]).text().trim() || "0", 10),
        jogos: parseInt($(cols[3]).text().trim() || "0", 10),
        vitorias: parseInt($(cols[4]).text().trim() || "0", 10),
        empates: parseInt($(cols[5]).text().trim() || "0", 10),
        derrotas: parseInt($(cols[6]).text().trim() || "0", 10),
        gols_pro: parseInt($(cols[7]).text().trim() || "0", 10),
        gols_contra: parseInt($(cols[8]).text().trim() || "0", 10),
        saldo: parseInt($(cols[9]).text().trim() || "0", 10)
      });
    });

    // Normalizar nomes para IDs do projeto
    for (const t of tabela) {
      try {
        const norm = await normalizeTeam(t.nome);
        if (norm) t.id = norm.id;
        else t.id = null;
      } catch (e) {
        console.warn("Erro ao normalizar:", t.nome, e);
      }
    }

    return tabela;
  } catch (error) {
    console.error("ERRO AO COLETAR TABELA DA CBF:", error.message || error);
    return null;
  }
}
