// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// páginas
import Home from "./pages/Home.jsx";
import TabelaProjetada from "./pages/TabelaProjetada.jsx";
import SimulacaoRodadas from "./pages/SimulacaoRodadas.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tabela" element={<TabelaProjetada />} />
      <Route path="/simulacao-rodadas" element={<SimulacaoRodadas />} />
    </Routes>
  </BrowserRouter>
);
