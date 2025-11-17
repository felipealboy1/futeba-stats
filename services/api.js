// services/api.js
import express from "express";
import cors from "cors";

// ---- serviços de acesso a dados normalizados ----
import { 
  getGamesByRodada, 
  getGameById, 
  getGamesByTime, 
  getAllGames 
} from "./games.js";

import { 
  getAllTimes, 
  getTimeBySlug 
} from "./times.js";

import { listRodadas } from "./rodadas.js";

// ---- modelos preditivos ----
import { predictGameById, predictRodada } from "../models/predict.js";
import { simulateSeason } from "../models/simulacao.js";
import { simularRodadas } from "../models/simulacaoRodadas.js";
import { 
  getSimulacaoRodadasCached,
  rebuildSimulacaoRodadas,
  cacheNeedsUpdate
} from "../models/simulacaoRodadasCache.js";

// ---- classificação oficial CBF ----
import { getClassificacaoOfficial } from "./classificacao.js";

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------- ROTAS BÁSICAS ---------------------------

app.get("/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Lista de times
app.get("/times", async (req, res) => {
  const times = await getAllTimes();
  res.json(times);
});

// Dados de um time
app.get("/time/:slug", async (req, res) => {
  const team = await getTimeBySlug(req.params.slug);
  if (!team) return res.status(404).json({ error: "Time não encontrado" });
  res.json(team);
});

// Jogos de um time
app.get("/jogos/time/:slug", async (req, res) => {
  const games = await getGamesByTime({ slug: req.params.slug });
  res.json(games);
});

// Todas as rodadas
app.get("/rodadas", async (req, res) => {
  const lista = await listRodadas("2025");
  res.json(lista);
});

// Jogos de uma rodada
app.get("/rodada/:num", async (req, res) => {
  const rodada = Number(req.params.num);
  const games = await getGamesByRodada("2025", rodada);
  res.json(games);
});

// Jogo específico
app.get("/jogo/:id", async (req, res) => {
  const id = Number(req.params.id);
  const game = await getGameById("2025", id);
  if (!game) return res.status(404).json({ error: "Jogo não encontrado" });
  res.json(game);
});

// TODOS os jogos
app.get("/jogos", async (req, res) => {
  const all = await getAllGames("2025");
  res.json(all);
});

// --------------------------- PREDIÇÕES ---------------------------

// Previsão de um jogo
app.get("/predict/jogo/:id", async (req, res) => {
  const r = await predictGameById("2025", Number(req.params.id));
  if (!r) return res.status(404).json({ error: "Jogo não encontrado" });
  res.json(r);
});

// Previsão da rodada
app.get("/predict/rodada/:n", async (req, res) => {
  const out = await predictRodada("2025", Number(req.params.n));
  res.json(out);
});

// Projeção campeonato
app.get("/projecao/campeonato", async (req, res) => {
  const nSim = Number(req.query.n) || 10000; 
  const out = await simulateSeason({ ano: "2025", nSim });
  res.json(out);
});

// --------------------------- CLASSIFICAÇÃO OFICIAL CBF ---------------------------

app.get("/classificacao/official", async (req, res) => {
  try {
    const tabela = await getClassificacaoOfficial();
    res.json(tabela);
  } catch (err) {
    console.error("Erro ao buscar classificação oficial:", err);
    res.status(500).json({ error: "Erro ao buscar classificação oficial" });
  }
});

// --------------------------- SIMULAÇÃO RODADA A RODADA ---------------------------

app.get("/simulacao/rodadas", async (req, res) => {
  try {
    const ano = "2025";

    // verifica se precisa atualizar
    const refresh = await cacheNeedsUpdate(ano);

    // SE PRECISA atualizar → MAS NÃO BLOQUEIA o usuário
    if (refresh) {
      console.log("♻ Precisa atualizar simulação — iniciando rebuild em background...");

      // dispara rebuild e NÃO aguarda
      rebuildSimulacaoRodadas(ano)
        .then(() => console.log("✔ Simulação atualizada em segundo plano"))
        .catch(err => console.error("❌ Erro no rebuild background:", err));
    }

    // SEMPRE responde rápido com cache atual
    const dados = await getSimulacaoRodadasCached(ano);
    res.json(dados);

  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao carregar simulação de rodadas" });
  }
});


// --------------------------- ADMIN REBUILD ---------------------------

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "TOKEN_SUPER_SECRETO";

app.post("/admin/rebuild", async (req, res) => {
  const token = req.query.token;
  
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    const ano = "2025";
    const nSim = 10000;

    const t0 = Date.now();

    console.log("🔮 Recalculando projeção...");
    await simulateSeason({ ano, nSim });

    console.log("🔮 Recalculando simulação rodada a rodada...");
    await rebuildSimulacaoRodadas(ano);

    const ms = Date.now() - t0;

    return res.json({
      status: "ok",
      msg: "Projeção + Rodadas recalculadas com sucesso",
      tempo_ms: ms
    });

  } catch (err) {
    console.log("❌ Erro no rebuild:", err);
    return res.status(500).json({ error: "Erro ao recalcular projeções" });
  }
});

// --------------------------- SERVIDOR ---------------------------

const PORT = 3001;
app.listen(PORT, () => {
  console.log("🚀 API rodando em http://localhost:" + PORT);
});
