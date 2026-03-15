const historico = [];
let grafico;
let intervaloAtual = 7;
let tipoGrafico = 'line';

function debounce(fn, delay = 500) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

async function converter() {
  const valor = parseFloat(document.getElementById("valor").value);
  const origem = document.getElementById("moedaOrigem").value;
  const destino = document.getElementById("moedaDestino").value;
  const resultado = document.getElementById("resultado");

  resultado.className = "resultado";

  if (isNaN(valor) || valor <= 0) {
    resultado.textContent = "Por favor, insira um valor válido.";
    resultado.classList.add("erro");
    return;
  }

  if (origem === destino) {
    resultado.textContent = "Selecione moedas diferentes.";
    resultado.classList.add("erro");
    return;
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/27653ec8692ed301294a938c/pair/${origem}/${destino}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.result !== "success" || !data.conversion_rate) {
      resultado.textContent = "Erro ao obter taxa de câmbio.";
      resultado.classList.add("erro");
      return;
    }

    const taxa = data.conversion_rate;
    const convertido = valor * taxa;

    resultado.innerHTML = `
      <strong>1 ${origem} = ${taxa.toFixed(4)} ${destino}</strong><br/>
      ${valor.toFixed(2)} ${origem} = <strong>${convertido.toFixed(2)} ${destino}</strong>
      <br/><span class="variacao" id="variacaoTexto"></span>
    `;
    resultado.classList.add("sucesso");

    adicionarAoHistorico(valor, origem, convertido, destino);
    carregarGrafico(origem, destino, intervaloAtual);
    mostrarVariacaoDiaria(origem, destino, taxa);
  } catch (error) {
    resultado.textContent = "Erro ao converter.";
    resultado.classList.add("erro");
    console.error("Erro:", error);
  }
}

function adicionarAoHistorico(valor, origem, convertido, destino) {
  const item = `${valor.toFixed(2)} ${origem} → ${convertido.toFixed(2)} ${destino}`;
  historico.unshift(item);
  if (historico.length > 10) historico.pop();
  atualizarListaHistorico();
  salvarHistorico();
}

function atualizarListaHistorico() {
  const historicoLista = document.getElementById("historico");
  historicoLista.innerHTML = "";
  historico.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = entry;
    historicoLista.appendChild(li);
  });
}

function salvarHistorico() {
  localStorage.setItem("historicoConversoes", JSON.stringify(historico));
}

function carregarHistoricoSalvo() {
  const salvo = localStorage.getItem("historicoConversoes");
  if (salvo) {
    historico.push(...JSON.parse(salvo));
    atualizarListaHistorico();
  }
}

async function carregarGrafico(origem, destino, dias = 7) {
  const fim = new Date().toISOString().split("T")[0];
  const inicioDate = new Date(Date.now() - (dias - 1) * 86400000);
  const inicio = inicioDate.toISOString().split("T")[0];

  const url = `https://api.frankfurter.app/${inicio}..${fim}?from=${origem}&to=${destino}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const labels = Object.keys(data.rates);
    const valoresTaxas = labels.map(date => data.rates[date][destino]);

    if (grafico) grafico.destroy();

    const ctx = document.getElementById("grafico").getContext("2d");
    grafico = new Chart(ctx, {
      type: tipoGrafico,
      data: {
        labels,
        datasets: [{
          label: `Taxa de câmbio ${origem} → ${destino}`,
          data: valoresTaxas,
          borderColor: '#ffd700',
          backgroundColor: '#ffd70022',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { labels: { color: 'white' } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Taxa: ${context.parsed.y.toFixed(4)}`;
              }
            }
          },
          title: {
            display: true,
            text: `Período: ${inicio} até ${fim}`,
            color: 'white',
            font: { size: 14 }
          }
        },
        scales: {
          x: { ticks: { color: 'white' } },
          y: {
            beginAtZero: false,
            ticks: {
              color: 'white',
              stepSize: 0.01
            }
          }
        }
      }
    });
    if (valoresTaxas.length > 0 && !valoresTaxas.includes(undefined)) {
      document.getElementById("wrapperAlternarGrafico").style.display = "block";
    } else {
      document.getElementById("wrapperAlternarGrafico").style.display = "none";
    }    
  } catch (err) {
    document.getElementById("wrapperAlternarGrafico").style.display = "none";
    console.error("Erro ao carregar gráfico:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnAlternar = document.getElementById("alternarTipoGrafico");
  if (btnAlternar) {
    btnAlternar.addEventListener("click", () => {
      tipoGrafico = tipoGrafico === 'line' ? 'bar' : 'line';
      converter();
    });
  }
});




async function mostrarVariacaoDiaria(origem, destino, taxaHoje) {
  const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const url = `https://api.frankfurter.app/${ontem}?from=${origem}&to=${destino}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.rates || !data.rates[destino]) return;

    const taxaOntem = data.rates[destino];
    const variacao = ((taxaHoje - taxaOntem) / taxaOntem) * 100;

    const texto = variacao >= 0
      ? `📈 Variação: +${variacao.toFixed(2)}%`
      : `📉 Variação: ${variacao.toFixed(2)}%`;

    const span = document.getElementById("variacaoTexto");
    if (span) span.textContent = texto;
  } catch (error) {
    console.error("Erro ao buscar variação:", error);
  }
}

function atualizarBandeira(selectId, imgId) {
  const select = document.getElementById(selectId);
  const img = document.getElementById(imgId);

  select.addEventListener("change", () => {
    const option = select.options[select.selectedIndex];
    const flag = option.getAttribute("data-flag");
    img.src = `https://flagcdn.com/${flag}.svg`;
    img.alt = option.value;
  });
}

function ativarConversaoAutomatica() {
  const valorInput = document.getElementById("valor");
  const moedaOrigem = document.getElementById("moedaOrigem");
  const moedaDestino = document.getElementById("moedaDestino");

  const handler = debounce(() => {
    if (valorInput.value.trim() !== "") {
      converter();
    }
  });

  valorInput.addEventListener("input", handler);
  moedaOrigem.addEventListener("change", handler);
  moedaDestino.addEventListener("change", handler);
}

function ativarSeletorIntervalo() {
  const seletor = document.getElementById("intervaloDias");
  seletor.addEventListener("change", () => {
    intervaloAtual = parseInt(seletor.value);
    converter();
  });
}

function ativarBotaoInverter() {
  const botao = document.getElementById("inverterMoedas");
  const selectOrigem = document.getElementById("moedaOrigem");
  const selectDestino = document.getElementById("moedaDestino");

  botao.addEventListener("click", () => {
    const temp = selectOrigem.value;
    selectOrigem.value = selectDestino.value;
    selectDestino.value = temp;

    selectOrigem.dispatchEvent(new Event("change"));
    selectDestino.dispatchEvent(new Event("change"));

    converter();
  });
}

// Inicialização
atualizarBandeira("moedaOrigem", "bandeiraOrigem");
atualizarBandeira("moedaDestino", "bandeiraDestino");
carregarHistoricoSalvo();
ativarConversaoAutomatica();
ativarSeletorIntervalo();
ativarBotaoInverter();

function inicializarMapa() {
  if (window._mapaInstanciado) return;
  window._mapaInstanciado = true;

  const paisParaMoeda = {
    "Argentina": "ARS",
    "Australia": "AUD",
    "Austria": "EUR",
    "Bangladesh": "BDT",
    "Belgium": "EUR",
    "Brazil": "BRL",
    "Canada": "CAD",
    "Chile": "CLP",
    "China": "CNY",
    "Colombia": "COP",
    "Denmark": "DKK",
    "Egypt": "EGP",
    "Finland": "EUR",
    "France": "EUR",
    "Germany": "EUR",
    "Greece": "EUR",
    "India": "INR",
    "Indonesia": "IDR",
    "Ireland": "EUR",
    "Israel": "ILS",
    "Italy": "EUR",
    "Japan": "JPY",
    "Mexico": "MXN",
    "Netherlands": "EUR",
    "New Zealand": "NZD",
    "Nigeria": "NGN",
    "Norway": "NOK",
    "Pakistan": "PKR",
    "Peru": "PEN",
    "Philippines": "PHP",
    "Poland": "PLN",
    "Portugal": "EUR",
    "Russia": "RUB",
    "Saudi Arabia": "SAR",
    "South Africa": "ZAR",
    "South Korea": "KRW",
    "Spain": "EUR",
    "Sweden": "SEK",
    "Switzerland": "CHF",
    "Thailand": "THB",
    "Turkey": "TRY",
    "Ukraine": "UAH",
    "United Arab Emirates": "AED",
    "United Kingdom": "GBP",
    "United States of America": "USD",
    "Vietnam": "VND"
  };
  

  const mapa = L.map("mapaMoeda").setView([20, 0], 2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB',
  }).addTo(mapa);
  

  fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
    .then(res => res.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        onEachFeature: (feature, layer) => {
          console.log("Propriedades do país:", feature.properties); // 👈 vamos ver o que existe
        
          const pais = feature.properties.ADMIN || feature.properties.NAME || feature.properties.name;
        
          layer.on("click", () => {
            console.log("País clicado:", pais);
            const moeda = paisParaMoeda[pais];
            if (moeda) {
              document.getElementById("moedaOrigem").value = moeda;
              document.getElementById("moedaOrigem").dispatchEvent(new Event("change"));
              converter();
            } else {
              console.warn(`País não mapeado: ${pais}`);
            }            
          });
        },
        style: {
          color: "#ffd700",         
          weight: 1,
          fillColor: "#ffd70033",   
          fillOpacity: 0.4
        }        
      }).addTo(mapa);
    });
}

async function carregarNoticiasEconomicas() {

  const lista = document.getElementById("listaNoticias");
  lista.innerHTML = "<li>Carregando notícias...</li>";

  try {

    const idioma = navigator.language || "en";

    let rss;

    if (idioma.startsWith("pt")) {
      rss = "https://pt.euronews.com/rss?level=theme&name=business";
    } 
    else if (idioma.startsWith("es")) {
      rss = "https://rss.elpais.com/rss/economia.xml";
    } 
    else if (idioma.startsWith("fr")) {
      rss = "https://www.lemonde.fr/economie/rss_full.xml";
    } 
    else {
      rss = "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml";
    }

    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`
    );

    const data = await response.json();

    lista.innerHTML = "";

    if (!data.items || data.items.length === 0) {
      lista.innerHTML = "<li>Nenhuma notícia encontrada</li>";
      return;
    }

    data.items.slice(0,6).forEach(noticia => {

      const li = document.createElement("li");

      li.innerHTML = `
        <a href="${noticia.link}" target="_blank">
          ${noticia.title}
        </a>
      `;

      lista.appendChild(li);

    });

  } catch (erro) {

    console.error("Erro ao carregar notícias:", erro);
    lista.innerHTML = "<li>Erro ao carregar notícias</li>";

  }
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("instalarApp");
  if (btn) {
    btn.style.display = "block";
    btn.addEventListener("click", async () => {
      btn.style.display = "none";
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("Usuário aceitou instalar o app.");
      } else {
        console.log("Usuário recusou instalar o app.");
      }

      deferredPrompt = null;
    });
  }
});

window.addEventListener("appinstalled", () => {
  console.log("App instalado com sucesso.");
  const btn = document.getElementById("instalarApp");
  if (btn) btn.style.display = "none";
});

// Carregar notícias ao abrir o site
window.addEventListener("load", carregarNoticiasEconomicas);

window.addEventListener("load", inicializarMapa);




