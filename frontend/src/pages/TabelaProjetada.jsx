// frontend/src/pages/TabelaProjetada.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./TabelaProjetada.css";
import { getProjecaoCampeonato, getTimes } from "../services/api";

function pct(n) {
  return (Number(n) * 100).toFixed(1) + "%";
}

export default function TabelaProjetada() {
  const [proj, setProj] = useState(null);
  const [times, setTimes] = useState({});

  useEffect(() => {
    async function load() {
      const lista = await getTimes();
      const mapa = {};
      lista.forEach(t => {
        mapa[t.id] = {
          nome: t.nome,
          escudo: t.escudo || null,
        };
      });

      const p = await getProjecaoCampeonato(10000);
      setTimes(mapa);
      setProj(p);
    }
    load();
  }, []);

  if (!proj || !proj.times) return <div>Carregando...</div>;

  const arr = Object.values(proj.times)
    .map(t => ({
      ...t,
      nome: times[t.id]?.nome || t.nome,
      escudo: times[t.id]?.escudo || null
    }))
    .sort((a, b) => a.posMedia - b.posMedia)
    .slice(0, 20);

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/">🏠 Home</Link>
        <Link to="/tabela" className="active">📊 Tabela Projetada</Link>
        <Link to="/simulacao-rodadas">🔮 Simulação Rodadas</Link>
      </nav>

      <h1 className="title">📊 Tabela Projetada — Modelo Completo</h1>
      <p className="subtitle">Simulações do campeonato: <strong>{proj.nSim}</strong></p>

      <div className="table-wrapper no-header">
        <table className="proj-table">
          <tbody>
            {arr.map((t, idx) => (
              <tr key={t.id}>
                
                {/* POSIÇÃO */}
                <td className="pos-cell">
                  <div className="pos-number">{idx + 1}</div>
                </td>

                {/* TIME */}
                <td className="team-cell">
                  <div className="team-wrapper">
                    {t.escudo && <img className="escudo" src={t.escudo} />}
                    <span className="team-name">{t.nome}</span>
                  </div>
                </td>

                {/* PROBABILIDADES */}
                {[
                  ["probTitulo", "Título"],
                  ["probG4", "G4"],
                  ["probG6", "G6"],
                  ["probSulAmericana", "Sul-Americana"],
                  ["probRebaixamento", "Rebaixamento"]
                ].map(([key, label]) => (
                  <td className="metric-cell" key={key}>
                    <div className="metric-value">{pct(t[key])}</div>
                    <div className="metric-bar-bg">
                      <div className={`metric-bar ${key}`} style={{ width: pct(t[key]) }}></div>
                    </div>
                    <div className="metric-label">{label}</div>
                  </td>
                ))}

                {/* MÉDIA */}
                <td className="metric-cell">
                  <div className="metric-value">{t.posMedia.toFixed(2)}</div>
                  <div className="metric-label">Média</div>
                </td>

                {/* MIN MAX */}
                <td className="metric-cell">
                  <div className="metric-value">{t.posMin} – {t.posMax}</div>
                  <div className="metric-label">Min–Max</div>
                </td>

                {/* DISTRIBUIÇÃO */}
                <td className="metric-cell">
                  <div className="sparkline">
                    {Object.entries(t.distPosicoes).map(([pos, count]) => {
                      const frac = count / proj.nSim;
                      const h = Math.max(3, frac * 130);
                      return (
                        <div
                          key={pos}
                          className="spark-bar"
                          style={{ height: h + "px" }}
                        />
                      );
                    })}
                  </div>
                  <div className="metric-label">Distribuição</div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
