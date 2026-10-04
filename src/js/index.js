// Lista de algoritmos con la propiedad 'gif' habilitada
const algoritmos = [
  {
    nombre: "Bubble Sort",
    complejidad: "O(n²)",
    descripcion: "Compara e intercambia elementos adyacentes.",
    gif: "",
  },
  {
    nombre: "Selection Sort",
    complejidad: "O(n²)",
    descripcion: "Busca el elemento menor y lo coloca en su posición.",
    gif: "",
  },
  {
    nombre: "Insertion Sort",
    complejidad: "O(n²)",
    descripcion: "Inserta cada elemento en la posición correcta.",
    gif: "",
  },
  {
    nombre: "Stooge Sort",
    complejidad: "O(n^2.71)",
    descripcion: "Utiliza recursividad para ordenar los elementos.",
    gif: "",
  },
  {
    nombre: "Gnome Sort",
    complejidad: "O(n²)",
    descripcion: "Compara elementos y retrocede cuando encuentra un error.",
    gif: "",
  },
  {
    nombre: "Exchange Sort",
    complejidad: "O(n²)",
    descripcion: "Compara pares de elementos y realiza intercambios.",
    gif: "",
  },
  {
    nombre: "Merge Sort",
    complejidad: "O(n log n)",
    descripcion: "Divide los datos y después combina las partes ordenadas.",
    gif: "",
  },
  {
    nombre: "Quick Sort",
    complejidad: "O(n log n)",
    descripcion: "Utiliza un elemento pivote para dividir los datos.",
    gif: "",
  },
];

// Arreglo en las barras
let valoresActuales = [10, 4, 8, 3, 7];
let algoritmosSeleccionados = ["Bubble Sort"];
let chartInstance = null;

// Objeto con la metrica inicial de cada algoritmo
let metricasData = {};

function resetMetricas() {
  metricasData = {};
  algoritmosSeleccionados.forEach((nombre) => {
    const algObj = algoritmos.find((a) => a.nombre === nombre);
    metricasData[nombre] = {
      comparaciones: 0,
      intercambios: 0,
      tiempoMs: "0.00",
      pasos: 0,
      complejidad: algObj ? algObj.complejidad : "N/A",
    };
  });
}

// Funcion que dibuja las tarjetas en el Menu con el apartado del GIF
function renderizarTarjetas(lista) {
  const grid = document.getElementById("algorithmsGrid");
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
          <div class="no-results">
            No se encontraron algoritmos parecidos. Intenta de nuevo.
          </div>
        `;
    return;
  }

  lista.forEach((alg) => {
    const card = document.createElement("div");
    card.className = "card";

    // Al hacer clic abre la vista del visualizador
    card.onclick = () => abrirVisualizador(alg.nombre);

    // Estructura interna de la tarjeta con el contenedor para el gif
    const gifContent = alg.gif
      ? `<img src="${alg.gif}" alt="GIF ${alg.nombre}" onerror="this.outerHTML='<span class=\\'card-gif-placeholder\\'>GIF</span>'">`
      : `<span class="card-gif-placeholder">GIF</span>`;

    card.innerHTML = `
          <div class="card-gif-container">
            ${gifContent}
          </div>
          <div class="card-info">
            <div class="card-title">${alg.nombre}</div>
            <div class="card-complexity">${alg.complejidad}</div>
            <div class="card-desc">${alg.descripcion}</div>
          </div>
        `;

    grid.appendChild(card);
  });
}

// Funcion para buscar y filtrar por texto o complejidad
function filtrarAlgoritmos() {
  const textoBusqueda = document
    .getElementById("searchInput")
    .value.toLowerCase();

  const filtroComplejidad = document.getElementById("complexityFilter").value;

  const resultados = algoritmos.filter((alg) => {
    const coincideNombre =
      alg.nombre.toLowerCase().includes(textoBusqueda) ||
      alg.descripcion.toLowerCase().includes(textoBusqueda);

    const coincideComplejidad =
      filtroComplejidad === "ALL" || alg.complejidad === filtroComplejidad;

    return coincideNombre && coincideComplejidad;
  });

  renderizarTarjetas(resultados);
}

// Genera la lista de casillas
function renderizarListaCheckboxes() {
  const checkboxList = document.getElementById("checkboxList");
  checkboxList.innerHTML = "";

  const modoComparar = document.getElementById("compareToggle").checked;

  algoritmos.forEach((alg) => {
    const item = document.createElement("label");
    item.className = "algo-checkbox-item";

    const isChecked = algoritmosSeleccionados.includes(alg.nombre);
    const disabledAttr = !modoComparar && !isChecked ? "disabled" : "";

    item.innerHTML = `
          <input 
            type="checkbox" 
            value="${alg.nombre}" 
            ${isChecked ? "checked" : ""} 
            ${disabledAttr}
            onchange="actualizarSeleccionAlgoritmos(this)"
          >
          <span>${alg.nombre}</span>
        `;

    checkboxList.appendChild(item);
  });
}

// Activa o Desactiva el modo comparacion desde el Toggle
function actualizarEstadoComparacion() {
  const modoComparar = document.getElementById("compareToggle").checked;

  if (!modoComparar && algoritmosSeleccionados.length > 1) {
    algoritmosSeleccionados = [algoritmosSeleccionados[0]];
  }

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

// Maneja la seleccion de las casillas
function actualizarSeleccionAlgoritmos(checkbox) {
  const modoComparar = document.getElementById("compareToggle").checked;

  if (!modoComparar) {
    algoritmosSeleccionados = [checkbox.value];
  } else {
    if (checkbox.checked) {
      if (!algoritmosSeleccionados.includes(checkbox.value)) {
        algoritmosSeleccionados.push(checkbox.value);
      }
    } else {
      if (algoritmosSeleccionados.length > 1) {
        algoritmosSeleccionados = algoritmosSeleccionados.filter(
          (a) => a !== checkbox.value,
        );
      } else {
        checkbox.checked = true; // Garantiza al menos una seleccion
      }
    }
  }

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

// Muestra la pantalla de inicio y oculta el menu
function abrirVisualizador(nombreAlgoritmo) {
  document.getElementById("mainHeader").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("visualizerScreen").style.display = "block";

  document.getElementById("compareToggle").checked = false;
  algoritmosSeleccionados = [nombreAlgoritmo];

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

// Muestra el menu y oculta la pantalla de inicio
function regresarAlInicio() {
  document.getElementById("visualizerScreen").style.display = "none";
  document.getElementById("mainHeader").style.display = "block";
  document.getElementById("mainContent").style.display = "block";
}

// Funcion que genera las barras en base al arreglo y algoritmos seleccionados
function dibujarBarras() {
  const container = document.getElementById("multiChartsContainer");
  container.innerHTML = "";

  const maxVal = Math.max(...valoresActuales, 1);

  algoritmosSeleccionados.forEach((nombreAlgo) => {
    const chartGroup = document.createElement("div");
    chartGroup.className = "single-chart-group";

    const chartArea = document.createElement("div");
    chartArea.className = "chart-area";

    valoresActuales.forEach((val) => {
      const barContainer = document.createElement("div");
      barContainer.className = "bar-container";

      const bar = document.createElement("div");
      bar.className = "bar";

      // Asignar altura de la barra segun su valor
      const alturaProporcional = (val / maxVal) * 130 + 15;
      bar.style.height = alturaProporcional + "px";

      // Numero visible debajo de cada barra
      const label = document.createElement("span");
      label.className = "bar-label";
      label.innerText = val;

      barContainer.appendChild(bar);
      barContainer.appendChild(label);
      chartArea.appendChild(barContainer);
    });

    const title = document.createElement("div");
    title.className = "algorithm-title";
    title.innerText = nombreAlgo;

    chartGroup.appendChild(chartArea);
    chartGroup.appendChild(title);
    container.appendChild(chartGroup);
  });
}

// Muestra las tarjetas de metricas
function renderizarTarjetasMetricas() {
  const container = document.getElementById("metricsCardsContainer");
  container.innerHTML = "";

  const colores = [
    "#ffffff",
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f1c40f",
    "#FFC0CB",
    "#800080",
    "#FFA500",
  ];

  algoritmosSeleccionados.forEach((nombre, idx) => {
    const m = metricasData[nombre] || {
      comparaciones: 0,
      intercambios: 0,
      tiempoMs: "0.00",
      pasos: 0,
      complejidad: "N/A",
    };

    const colorAccent = colores[idx % colores.length];

    const card = document.createElement("div");
    card.className = "metric-card";
    card.style.borderLeftColor = colorAccent;

    card.innerHTML = `
          <div class="metric-card-title">${nombre}</div>
          <div class="metric-item">
            <span>Comparaciones:</span>
            <span class="val">${m.comparaciones}</span>
          </div>
          <div class="metric-item">
            <span>Intercambios:</span>
            <span class="val">${m.intercambios}</span>
          </div>
          <div class="metric-item">
            <span>Tiempo ejecución:</span>
            <span class="val">${m.tiempoMs} ms</span>
          </div>
          <div class="metric-item">
            <span>Cantidad de pasos:</span>
            <span class="val">${m.pasos}</span>
          </div>
          <div class="metric-item">
            <span>Complejidad teórica:</span>
            <span class="val">${m.complejidad}</span>
          </div>
        `;

    container.appendChild(card);
  });
}

// Inicializa la grafica de metricas vacia
function inicializarGraficaMetricas() {
  const ctx = document.getElementById("metricsChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#ffffff",
            font: { size: 10 },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#aaaaaa" },
          grid: { color: "#444444" },
        },
        y: {
          ticks: { color: "#aaaaaa" },
          grid: { color: "#444444" },
          beginAtZero: true,
        },
      },
    },
  });
}

// Genera valores aleatorios segun la cantidad en "Elements"
function generarElementosAleatorios() {
  const cantidad =
    parseInt(document.getElementById("elementsInput").value) || 5;
  valoresActuales = [];

  for (let i = 0; i < cantidad; i++) {
    const valorRandom = Math.floor(Math.random() * 20) + 1;
    valoresActuales.push(valorRandom);
  }

  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
}

// Lee los valores ingresados por el usuario en "Custom"
function insertarElementosPersonalizados() {
  const inputTexto = document.getElementById("customElementsInput").value;

  if (inputTexto.trim() !== "") {
    const listaNumeros = inputTexto
      .split(",")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (listaNumeros.length > 0) {
      valoresActuales = listaNumeros;
      document.getElementById("elementsInput").value = listaNumeros.length;
      dibujarBarras();
      resetMetricas();
      renderizarTarjetasMetricas();
    } else {
      alert("Por favor, ingresa números válidos separados por comas.");
    }
  } else {
    generarElementosAleatorios();
  }
}

// Función vacia para vincular con la logica desde GitHub
function ejecutarSimulacion() {
  // Aquí se insertará la lógica proveniente del repositorio
}

// Carga inicial al abrir la página
document.addEventListener("DOMContentLoaded", () => {
  renderizarTarjetas(algoritmos);
});