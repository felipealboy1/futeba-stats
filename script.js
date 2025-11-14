document.getElementById("btn-carregar").addEventListener("click", carregarDados);
document.getElementById("btn-simular").addEventListener("click", simularCampeonato);
document.getElementById("btn-darkmode").addEventListener("click", alternarDarkMode);
document.getElementById("btn-exportar").addEventListener("click", exportarImagemFavorito);

let dadosGlobais = null;
let forcasGlobais = null;
let jogosRestantesGlobais = null;

let graficoCampeao = null;
let graficoG6 = null;
let graficoZ4 = null;
let graficoPosicao = null;

let timeFavorito = localStorage.getItem("timeFavorito") || "";
let temaAtual = localStorage.getItem("tema") || "claro";

/* ======================================================
   APLICAR TEMA AO CARREGAR A PÁGINA
   ====================================================== */
if (temaAtual === "escuro") {
    document.body.classList.add("dark");
    document.getElementById("btn-darkmode").textContent = "☀️ Modo Claro";
}

/* ======================================================
   CARREGAR DADOS
   ====================================================== */
async function carregarDados() {
    try {
        const respTabela = await fetch("dados/campeonato.json");
        const dados = await respTabela.json();
        dadosGlobais = dados;

        const respJogos = await fetch("dados/jogos_restantes.json");
        const dadosJogos = await respJogos.json();
        jogosRestantesGlobais = dadosJogos;

        /* tabela */
        let html = `
            <h2>Rodada ${dados.rodada_atual} de ${dados.rodadas_totais}</h2>
            <table>
                <tr>
                    <th>Time</th>
                    <th>Pontos</th>
                    <th>Jogos</th>
                    <th>Vitórias</th>
                    <th>Empates</th>
                    <th>Derrotas</th>
                    <th>Gols Pró</th>
                    <th>Gols Contra</th>
                </tr>
        `;

        const forcas = {};
        forcasGlobais = forcas;

        dados.times.forEach(t => {
            html += `
                <tr>
                    <td>${t.nome}</td>
                    <td>${t.pontos}</td>
                    <td>${t.jogos}</td>
                    <td>${t.vitorias}</td>
                    <td>${t.empates}</td>
                    <td>${t.derrotas}</td>
                    <td>${t.gols_pro}</td>
                    <td>${t.gols_contra}</td>
                </tr>
            `;

            const ppj = t.pontos / (t.jogos || 1);
            forcas[t.nome] = ppj * 10 + (t.gols_pro - t.gols_contra) + t.vitorias * 2;
        });

        html += "</table>";
        document.getElementById("tabela").innerHTML = html;

        /* dropdown do favorito */
        const select = document.getElementById("time-favorito");
        select.innerHTML = `<option value="">-- selecione --</option>`;
        dados.times.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.nome;
            opt.textContent = t.nome;
            if (t.nome === timeFavorito) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener("change", () => {
            timeFavorito = select.value;
            localStorage.setItem("timeFavorito", timeFavorito);
            destacarCardFavorito();
            simularCampeonato();
        });

        document.getElementById("cards-container").innerHTML = "";
        document.getElementById("resultado-simulacao").innerHTML = "";

    } catch (e) {
        console.error("Erro ao carregar dados:", e);
        alert("Erro ao carregar dados.");
    }
}

/* ======================================================
   SIMULAR JOGO
   ====================================================== */
function simularJogo(a, b) {
    const fa = forcasGlobais[a];
    const fb = forcasGlobais[b];

    if (fa === undefined || fb === undefined) {
        const r = Math.random();
        if (r < 0.33) return "A";
        if (r < 0.66) return "E";
        return "B";
    }

    const dif = fa - fb;
    let pA = 1 / (1 + Math.pow(10, -dif / 20));
    let pE = 0.25;
    let pB = 1 - pA;

    pA *= 0.75;
    pB *= 0.75;

    const soma = pA + pE + pB;
    pA /= soma;
    pE /= soma;
    pB /= soma;

    const s = Math.random();
    if (s < pA) return "A";
    if (s < pA + pE) return "E";
    return "B";
}

/* ======================================================
   SIMULAR CAMPEONATO UMA VEZ
   ====================================================== */
function simularUmaVez() {
    const tabela = JSON.parse(JSON.stringify(dadosGlobais.times));
    const map = {};
    tabela.forEach(t => (map[t.nome] = t));

    jogosRestantesGlobais.rodadas.forEach(r => {
        r.jogos.forEach(j => {
            const res = simularJogo(j.mandante, j.visitante);
            if (res === "A") map[j.mandante].pontos += 3;
            else if (res === "B") map[j.visitante].pontos += 3;
            else {
                map[j.mandante].pontos++;
                map[j.visitante].pontos++;
            }
        });
    });

    tabela.sort((a, b) => b.pontos - a.pontos);
    return tabela;
}

/* ======================================================
   SIMULAR N VEZES
   ====================================================== */
function simularVariasVezes(n) {
    const cont = {};
    dadosGlobais.times.forEach(t => {
        cont[t.nome] = { campeao: 0, g6: 0, z4: 0, somaPos: 0 };
    });

    for (let i = 0; i < n; i++) {
        const res = simularUmaVez();
        res.forEach((t, idx) => {
            const pos = idx + 1;
            const c = cont[t.nome];

            if (pos === 1) c.campeao++;
            if (pos <= 6) c.g6++;
            if (pos > res.length - 4) c.z4++;
            c.somaPos += pos;
        });
    }

    return cont;
}

/* ======================================================
   GRÁFICO COM TEMA E FAVORITO
   ====================================================== */
function criarGrafico(id, labels, valores, titulo, max = 100) {
    const ctx = document.getElementById(id).getContext("2d");

    const corFavorito = temaAtual === "escuro" ? "#ffcc00" : "#ff9900";
    const corNormal   = temaAtual === "escuro" ? "#66aaff" : "rgba(54,162,235,0.7)";
    const corTexto    = temaAtual === "escuro" ? "#eee" : "#111";

    const cores = labels.map(t => t === timeFavorito ? corFavorito : corNormal);

    return new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: titulo,
                data: valores,
                backgroundColor: cores
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: corTexto } }
            },
            scales: {
                x: { ticks: { color: corTexto } },
                y: { ticks: { color: corTexto }, beginAtZero: true, max }
            }
        }
    });
}

/* ======================================================
   CARDS
   ====================================================== */
function gerarCards(res, n) {
    const cont = document.getElementById("cards-container");
    cont.innerHTML = "";

    const times = Object.keys(res).sort((a,b)=>res[b].campeao - res[a].campeao);

    times.forEach(time => {
        const r = res[time];
        const camp = r.campeao/n*100;
        const g6   = r.g6/n*100;
        const z4   = r.z4/n*100;
        const pos  = r.somaPos/n;

        const card = document.createElement("div");
        card.className = "card-time";
        if (time === timeFavorito) card.classList.add("card-favorito");

        card.innerHTML = `
            <h3>${time}</h3>

            <p><strong>Campeão:</strong> ${camp.toFixed(2)}%</p>
            <div class="barra barra-campeao">
                <div style="height:10px;width:${camp}%;background:linear-gradient(90deg,#ffb347,#ff6a6a);"></div>
            </div>

            <p><strong>G6:</strong> ${g6.toFixed(2)}%</p>
            <div class="barra barra-g6">
                <div style="height:10px;width:${g6}%;background:linear-gradient(90deg,#7bd389,#2db86b);"></div>
            </div>

            <p><strong>Z4:</strong> ${z4.toFixed(2)}%</p>
            <div class="barra barra-z4">
                <div style="height:10px;width:${z4}%;background:linear-gradient(90deg,#ff9a9e,#ff4d4d);"></div>
            </div>

            <p><strong>Posição média:</strong> ${pos.toFixed(2)}</p>
        `;

        cont.appendChild(card);
    });
}

function destacarCardFavorito() {
    document.querySelectorAll(".card-time").forEach(c => {
        c.classList.remove("card-favorito");
        const nome = c.querySelector("h3").textContent;
        if (nome === timeFavorito) c.classList.add("card-favorito");
    });
}

/* ======================================================
   EXPORTAR IMAGEM DO TIME FAVORITO
   ====================================================== */
async function exportarImagemFavorito() {
    if (!timeFavorito) {
        alert("Escolha um time favorito primeiro!");
        return;
    }

    const cards = document.querySelectorAll(".card-time");
    let cardFav = null;

    cards.forEach(c => {
        if (c.querySelector("h3").textContent === timeFavorito) {
            cardFav = c;
        }
    });

    if (!cardFav) {
        alert("Simule o campeonato primeiro para gerar os cards!");
        return;
    }

    // animação leve para efeito visual
    cardFav.style.transform = "scale(1.05)";
    setTimeout(() => (cardFav.style.transform = ""), 300);

    // captura de tela
    const canvas = await html2canvas(cardFav, {
        backgroundColor: temaAtual === "escuro" ? "#121212" : "#ffffff",
        scale: 2
    });

    const link = document.createElement("a");
    link.download = `previsao-${timeFavorito}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

/* ======================================================
   DARK MODE
   ====================================================== */
function alternarDarkMode() {
    if (temaAtual === "claro") {
        temaAtual = "escuro";
        document.body.classList.add("dark");
        document.getElementById("btn-darkmode").textContent = "☀️ Modo Claro";
    } else {
        temaAtual = "claro";
        document.body.classList.remove("dark");
        document.getElementById("btn-darkmode").textContent = "🌙 Modo Escuro";
    }

    localStorage.setItem("tema", temaAtual);
    if (dadosGlobais) simularCampeonato();
}

/* ======================================================
   SIMULA CAMPEONATO
   ====================================================== */
function simularCampeonato() {
    if (!dadosGlobais) {
        alert("Carregue os dados primeiro!");
        return;
    }

    const n = 500;
    const r = simularVariasVezes(n);

    const labels = Object.keys(r);
    const campeao = labels.map(t => r[t].campeao/n*100);
    const g6      = labels.map(t => r[t].g6/n*100);
    const z4      = labels.map(t => r[t].z4/n*100);
    const pos     = labels.map(t => r[t].somaPos/n);

    if (graficoCampeao) graficoCampeao.destroy();
    if (graficoG6) graficoG6.destroy();
    if (graficoZ4) graficoZ4.destroy();
    if (graficoPosicao) graficoPosicao.destroy();

    graficoCampeao = criarGrafico("grafico-campeao", labels, campeao, "Campeão (%)");
    graficoG6      = criarGrafico("grafico-g6", labels, g6, "G6 (%)");
    graficoZ4      = criarGrafico("grafico-z4", labels, z4, "Z4 (%)");
    graficoPosicao = criarGrafico("grafico-posicao", labels, pos, "Posição Média", 20);

    gerarCards(r, n);
    destacarCardFavorito();

    document.getElementById("resultado-simulacao").innerHTML =
        `<h2>Simulações concluídas (${n}x)!</h2>`;
}
