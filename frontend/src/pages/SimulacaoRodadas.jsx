import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./SimulacaoRodadas.css";
import { getSimulacaoRodadas } from "../services/api";

function fmtPct(value, total) {
  if (!total || total === 0) return "0.0%";
  return ((value / total) * 100).toFixed(1) + "%";
}

export default function SimulacaoRodadas() {
  const [data, setData] = useState([]);
  const [hideFinalized, setHideFinalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const r = await getSimulacaoRodadas();

      // <<< CORREÇÃO: detectar se backend já está no formato correto >>>
      if (
        Array.isArray(r) &&
        r.length > 0 &&
        typeof r[0] === "object" &&
        Array.isArray(r[0].jogos)
      ) {
        // formato correto vindo do backend → NÃO AGRUPAR
        setData(r);
      } else {
        // formato achatado → AGRUPAR
        const map = new Map();
        for (const j of r) {
          const rd = Number(j.rodada);
          if (!map.has(rd)) map.set(rd, { rodada: rd, jogos: [], classificacao: [] });

          map.get(rd).jogos.push({
            mandante: j.mandante,
            visitante: j.visitante,
            placar: j.placar,
            tipo: j.tipo,
            sims: j.sims
          });
        }
        const grouped = Array.from(map.values()).sort((a, b) => a.rodada - b.rodada);
        setData(grouped);
      }

      setLoading(false);
    }
    load();
  }, []);

  const visibleData = useMemo(() => {
    if (!hideFinalized) return data;
    return data.filter((rod) => Array.isArray(rod.jogos) && rod.jogos.some(j => j.tipo !== "real"));
  }, [data, hideFinalized]);

  if (loading) return <h2 style={{ padding: 20 }}>Carregando simulações...</h2>;

  return (
    <div className="page">

      <nav className="nav">
        <Link to="/">🏠 Home</Link>
        <Link to="/tabela">📊 Tabela Projetada</Link>
        <Link to="/simulacao-rodadas" className="active">🔮 Simulação Rodadas</Link>
      </nav>

      <header className="page-header">
        <div>
          <h1 className="title-main">🔮 Simulação Rodada a Rodada</h1>
          <p className="subtitle">
            Cada jogo pendente é simulado <strong>10.000</strong> vezes.
          </p>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={hideFinalized}
            onChange={(e) => setHideFinalized(e.target.checked)}
          />
          Ocultar rodadas finalizadas
        </label>
      </header>

      <div className="rodadas-grid">
        {visibleData.map((rod) => (
          <section key={rod.rodada} className="rodada-card">
            <div className="rodada-header">
              <h2>Rodada {rod.rodada}</h2>

              <span className="rodada-badge-pill">
                {rod.jogos.every((j) => j.tipo === "real") ? "Finalizada" : "Contém simulações"}
              </span>
            </div>

            <div className="rodada-body">

              <div className="col-left">
                {rod.jogos.map((j, index) => {
                  const total = j?.sims?.total || 0;

                  return (
                    <div key={index} className={`game-card ${j.tipo === "real" ? "real-card" : "sim-card"}`}>
                      <div className="game-grid">
                        <div className="team-left">{j.mandante}</div>
                        <div className="score">{j.placar.replace("x", "×")}</div>
                        <div className="team-right">{j.visitante}</div>
                        <div className={`status-pill ${j.tipo === "real" ? "pill-real" : "pill-sim"}`}>
                          {j.tipo === "real" ? "Real" : "Simulado"}
                        </div>
                      </div>

                      {j.tipo === "simulado" && j.sims && (
                        <div className="prob-grid">
                          <div className="prob-item-center">
                            <span className="prob-label">Casa:</span>
                            <span className="prob-value">{fmtPct(j.sims.home, total)}</span>
                          </div>
                          <div className="prob-item-center">
                            <span className="prob-label">Emp:</span>
                            <span className="prob-value">{fmtPct(j.sims.draw, total)}</span>
                          </div>
                          <div className="prob-item-center">
                            <span className="prob-label">Fora:</span>
                            <span className="prob-value">{fmtPct(j.sims.away, total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <aside className="col-right">
                <h3 className="classif-title">
                  Classificação após a rodada {rod.rodada}
                </h3>

                <table className="classif-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Pts</th>
                      <th>J</th>
                      <th>V</th>
                      <th>E</th>
                      <th>D</th>
                      <th>GP</th>
                      <th>GC</th>
                      <th>SG</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rod.classificacao?.map((t, i) => (
                      <tr key={t.id ?? i}>
                        <td>{i + 1}</td>
                        <td className="left">{t.nome}</td>
                        <td>{t.pts}</td>
                        <td>{t.j}</td>
                        <td>{t.v}</td>
                        <td>{t.e}</td>
                        <td>{t.d}</td>
                        <td>{t.gp}</td>
                        <td>{t.gc}</td>
                        <td>{t.sg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </aside>

            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
