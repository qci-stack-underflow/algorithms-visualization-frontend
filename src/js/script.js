import "@sass/style.scss";
import Chart from "chart.js/auto";
import { MotorAnimacion } from "./animador.js";
import { compararAlgoritmos, ejecutarAlgoritmo, nombreAId } from "./api.js";
import { convertirPasos } from "./pasos.js";
// Lista de algoritmos
export const algoritmos = [
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

// Estado de la aplicación
const MAX_ELEMENTOS = 50;
let valoresActuales = [10, 4, 8, 3, 7];
let algoritmosSeleccionados = ["Bubble Sort"];
let chartInstance = null;
let metricasData = {};
let motores = []; // un MotorAnimacion por algoritmo seleccionado

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

function renderizarTarjetas(lista) {
  const grid = document.getElementById("algorithmsGrid");
  if (!grid) return;
  
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

    // Asignación de evento mediante listener
    card.addEventListener("click", () => abrirVisualizador(alg.nombre));

    const gifContainer = document.createElement("div");
    gifContainer.className = "card-gif-container";

    if (alg.gif) {
      const image = document.createElement("img");
      image.src = alg.gif;
      image.alt = `GIF ${alg.nombre}`;
      image.addEventListener(
        "error",
        () => {
          const placeholder = document.createElement("span");
          placeholder.className = "card-gif-placeholder";
          placeholder.textContent = "GIF";
          image.replaceWith(placeholder);
        },
        { once: true }
      );
      gifContainer.appendChild(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "card-gif-placeholder";
      placeholder.textContent = "GIF";
      gifContainer.appendChild(placeholder);
    }

    const cardInfo = document.createElement("div");
    cardInfo.className = "card-info";
    cardInfo.innerHTML = `
      <div class="card-title">${alg.nombre}</div>
      <div class="card-complexity">${alg.complejidad}</div>
      <div class="card-desc">${alg.descripcion}</div>
    `;

    card.appendChild(gifContainer);
    card.appendChild(cardInfo);

    grid.appendChild(card);
  });
}

function filtrarAlgoritmos() {
  const inputSearch = document.getElementById("searchInput");
  const filterComplexity = document.getElementById("complexityFilter");

  const textoBusqueda = inputSearch ? inputSearch.value.toLowerCase() : "";
  const filtroComplejidad = filterComplexity ? filterComplexity.value : "ALL";

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

function renderizarListaCheckboxes() {
  const checkboxList = document.getElementById("checkboxList");
  if (!checkboxList) return;
  
  checkboxList.innerHTML = "";

  const compareToggle = document.getElementById("compareToggle");
  const modoComparar = compareToggle ? compareToggle.checked : false;

  algoritmos.forEach((alg) => {
    const item = document.createElement("label");
    item.className = "algo-checkbox-item";

    const isChecked = algoritmosSeleccionados.includes(alg.nombre);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = alg.nombre;
    checkbox.checked = isChecked;
    if (!modoComparar && !isChecked) {
      checkbox.disabled = true;
    }

    checkbox.addEventListener("change", (e) => actualizarSeleccionAlgoritmos(e.target));

    const labelText = document.createElement("span");
    labelText.textContent = alg.nombre;

    item.appendChild(checkbox);
    item.appendChild(labelText);
    checkboxList.appendChild(item);
  });
}

function actualizarEstadoComparacion() {
  const compareToggle = document.getElementById("compareToggle");
  const modoComparar = compareToggle ? compareToggle.checked : false;

  if (!modoComparar && algoritmosSeleccionados.length > 1) {
    algoritmosSeleccionados = [algoritmosSeleccionados[0]];
  }

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

function actualizarSeleccionAlgoritmos(checkbox) {
  const compareToggle = document.getElementById("compareToggle");
  const modoComparar = compareToggle ? compareToggle.checked : false;

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
          (a) => a !== checkbox.value
        );
      } else {
        checkbox.checked = true;
      }
    }
  }

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

function abrirVisualizador(nombreAlgoritmo) {
  document.getElementById("mainHeader").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("visualizerScreen").style.display = "block";

  const compareToggle = document.getElementById("compareToggle");
  if (compareToggle) compareToggle.checked = false;

  algoritmosSeleccionados = [nombreAlgoritmo];

  renderizarListaCheckboxes();
  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
  inicializarGraficaMetricas();
}

function regresarAlInicio() {
  document.getElementById("visualizerScreen").style.display = "none";
  document.getElementById("mainHeader").style.display = "block";
  document.getElementById("mainContent").style.display = "block";
}

function dibujarBarras() {
  const container = document.getElementById("multiChartsContainer");
  if (!container) return;

  motores.forEach((motor) => motor.detener());
  motores = [];
  container.innerHTML = "";

  const selectVelocidad = document.getElementById("selectVelocidad");

  algoritmosSeleccionados.forEach((nombreAlgo) => {
    const chartGroup = document.createElement("div");
    chartGroup.className = "single-chart-group";

    const displayContainer = document.createElement("div");

    const title = document.createElement("div");
    title.className = "algorithm-title";
    title.innerText = nombreAlgo;

    chartGroup.appendChild(displayContainer);
    chartGroup.appendChild(title);
    container.appendChild(chartGroup);

    // El estado inicial se dibuja con el mismo motor que después anima.
    const motor = new MotorAnimacion(displayContainer);
    if (selectVelocidad) motor.velocidadMs = Number(selectVelocidad.value);
    motor.renderizarBarraEstado({
      tipo: "inicial",
      indices: [],
      arrayState: valoresActuales,
    });
    motores.push(motor);
  });
}

function renderizarTarjetasMetricas() {
  const container = document.getElementById("metricsCardsContainer");
  if (!container) return;
  
  container.innerHTML = "";

  const colores = [
    "#ffffff", "#e74c3c", "#3498db", "#2ecc71",
    "#f1c40f", "#FFC0CB", "#800080", "#FFA500",
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

function inicializarGraficaMetricas() {
  const canvas = document.getElementById("metricsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

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

function generarElementosAleatorios() {
  const input = document.getElementById("elementsInput");
  const cantidadSolicitada = Number.parseInt(input ? input.value : "5", 10);
  const cantidad = Number.isNaN(cantidadSolicitada)
    ? 5
    : Math.min(MAX_ELEMENTOS, Math.max(1, cantidadSolicitada));
  if (input) input.value = cantidad;
  valoresActuales = [];

  for (let i = 0; i < cantidad; i++) {
    const valorRandom = Math.floor(Math.random() * 20) + 1;
    valoresActuales.push(valorRandom);
  }

  dibujarBarras();
  resetMetricas();
  renderizarTarjetasMetricas();
}

function insertarElementosPersonalizados() {
  const customInput = document.getElementById("customElementsInput");
  const inputTexto = customInput ? customInput.value : "";

  if (inputTexto.trim() !== "") {
    const elementos = inputTexto.split(",").map((elemento) => elemento.trim());
    const entradaValida =
      inputTexto.includes(",") &&
      elementos.every((elemento) => /^[+-]?\d+$/.test(elemento));

    if (entradaValida) {
      const listaNumeros = elementos.map(Number);
      if (listaNumeros.length > MAX_ELEMENTOS) {
        alert(`El arreglo no puede tener más de ${MAX_ELEMENTOS} elementos.`);
        return;
      }

      valoresActuales = listaNumeros;
      const elemInput = document.getElementById("elementsInput");
      if (elemInput) elemInput.value = listaNumeros.length;
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

// Los algoritmos se ejecutan en el backend; aquí solo se piden los
// resultados, se muestran las métricas y se animan los pasos.
export async function ejecutarSimulacion() {
  if (algoritmosSeleccionados.length === 0) {
    alert("Selecciona al menos un algoritmo para ejecutar la simulación.");
    return;
  }

  const boton = document.getElementById("btnSimulate");
  if (boton) boton.disabled = true;

  let resultados;
  try {
    const ids = algoritmosSeleccionados.map(nombreAId);
    resultados =
      ids.length === 1
        ? [await ejecutarAlgoritmo(ids[0], valoresActuales)]
        : await compararAlgoritmos(ids, valoresActuales);
  } catch (error) {
    alert(error.message);
    return;
  } finally {
    if (boton) boton.disabled = false;
  }

  resultados.forEach((resultado, indice) => {
    const nombre = algoritmosSeleccionados[indice];
    const algoritmo = algoritmos.find((item) => item.nombre === nombre);
    metricasData[nombre] = {
      comparaciones: resultado.metrics.comparisons,
      intercambios: resultado.metrics.swaps,
      tiempoMs: resultado.metrics.executionTimeMs.toFixed(3),
      pasos: resultado.metrics.steps,
      complejidad: algoritmo ? algoritmo.complejidad : "N/A",
    };
  });
  renderizarTarjetasMetricas();

  if (chartInstance) {
    chartInstance.data.labels = ["Comparaciones", "Intercambios", "Pasos"];
    chartInstance.data.datasets = resultados.map(({ metrics }, indice) => ({
      label: algoritmosSeleccionados[indice],
      data: [metrics.comparisons, metrics.swaps, metrics.steps],
      borderColor: [
        "#ffffff", "#e74c3c", "#3498db", "#2ecc71",
        "#f1c40f", "#FFC0CB", "#800080", "#FFA500",
      ][indice % 8],
      backgroundColor: "transparent",
      tension: 0.2,
    }));
    chartInstance.update();
  }

  // Cada algoritmo se anima a la vez sobre su copia del mismo arreglo.
  dibujarBarras();
  resultados.forEach((resultado, indice) => {
    motores[indice].cargarPasos(convertirPasos(resultado));
    motores[indice].reproducir();
  });
}

function reiniciarSimulacion() {
  motores.forEach((motor) => motor.reiniciar());
}

function cambiarVelocidad(evento) {
  motores.forEach((motor) => motor.fijarVelocidad(evento.target.value));
}

// Inicialización de Event Listeners e inicio de interfaz
document.addEventListener("DOMContentLoaded", () => {
  renderizarTarjetas(algoritmos);

  // Vincular eventos a inputs/botones del DOM para evitar inline 'onclick' u 'onchange'
  document.getElementById("searchInput")?.addEventListener("input", filtrarAlgoritmos);
  document.getElementById("btnSearch")?.addEventListener("click", filtrarAlgoritmos);
  document.getElementById("complexityFilter")?.addEventListener("change", filtrarAlgoritmos);
  document.getElementById("elementsInput")?.addEventListener("change", generarElementosAleatorios);
  document.getElementById("compareToggle")?.addEventListener("change", actualizarEstadoComparacion);
  document.getElementById("btnBack")?.addEventListener("click", regresarAlInicio);
  document.getElementById("btnCustom")?.addEventListener("click", insertarElementosPersonalizados);
  document.getElementById("btnSimulate")?.addEventListener("click", ejecutarSimulacion);
  document.getElementById("btnReiniciar")?.addEventListener("click", reiniciarSimulacion);
  document.getElementById("selectVelocidad")?.addEventListener("change", cambiarVelocidad);
});
