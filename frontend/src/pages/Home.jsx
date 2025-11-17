// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClassificacaoOfficial } from "../services/api";
import "./SimulacaoRodadas.css";

export default function Home() {
  const [classifOfficial, setClassifOfficial] = useState([]);

  useEffect(() => {
    async function load() {
      const tabela = await getClassificacaoOfficial();
      setClassifOfficial(tabela || []);
    }
    load();
  }, []);

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="active">🏠 Home</Link>
        <Link to="/tabela">📊 Tabela Projetada</Link>
        <Link to="/simulacao-rodadas">🔮 Simulação Rodadas</Link>
      </nav>

      <h1>🏆 Projeções Brasileirão 2025</h1>
      <p>Dados reais da CBF + projeções Monte Carlo por jogo (10.000 simulações por partida).</p>

      <div className="real-classif-box">
        <h2>📌 Classificação Oficial (CBF)</h2>
        <table className="classif-table">
          <thead>
            <tr>
              <th>#</th><th>Time</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th>
            </tr>
          </thead>
          <tbody>
            {(classifOfficial || []).map((t, i) => (
              <tr key={(t && (t.id ?? i)) || i}>
                <td>{t?.position ?? (i + 1)}</td>
                <td>{t?.nome ?? "—"}</td>
                <td>{t?.pts ?? "—"}</td>
                <td>{t?.j ?? "—"}</td>
                <td>{t?.v ?? "—"}</td>
                <td>{t?.e ?? "—"}</td>
                <td>{t?.d ?? "—"}</td>
                <td>{t?.gp ?? "—"}</td>
                <td>{t?.gc ?? "—"}</td>
                <td>{t?.sg ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
