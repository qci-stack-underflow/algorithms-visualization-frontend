import "@sass/style.scss";
import Chart from "chart.js/auto";
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
  
  container.innerHTML = "";

  const maxVal = Math.max(...valoresActuales, 1);

  algoritmosSeleccionados.forEach((nombreAlgo) => {
    const chartGroup = document.createElement("div");
    chartGroup.className = "single-chart-group";

    const chartArea = document.createElement("div");
    chartArea.className = "chart-area";
    if (valoresActuales.length > 20) {
      chartArea.classList.add("chart-area-compact");
      chartArea.style.setProperty("--bar-count", valoresActuales.length);
    }

    valoresActuales.forEach((val, index) => {
      const barContainer = document.createElement("div");
      barContainer.className = "bar-container";
      barContainer.title = `Elemento ${index + 1}: ${val}`;

      const bar = document.createElement("div");
      bar.className = "bar";

      const alturaProporcional = (val / maxVal) * 130 + 15;
      bar.style.height = `${alturaProporcional}px`;

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

function ordenarYMedir(nombreAlgoritmo, valores) {
  const arreglo = [...valores];
  let comparaciones = 0;
  let intercambios = 0;
  const inicio = performance.now();

  const comparar = (a, b) => {
    comparaciones += 1;
    return a - b;
  };

  const intercambiar = (i, j) => {
    if (i === j) return;
    [arreglo[i], arreglo[j]] = [arreglo[j], arreglo[i]];
    intercambios += 1;
  };

  if (nombreAlgoritmo === "Bubble Sort") {
    for (let fin = arreglo.length - 1; fin > 0; fin -= 1) {
      let huboIntercambio = false;
      for (let i = 0; i < fin; i += 1) {
        if (comparar(arreglo[i], arreglo[i + 1]) > 0) {
          intercambiar(i, i + 1);
          huboIntercambio = true;
        }
      }
      if (!huboIntercambio) break;
    }
  } else if (nombreAlgoritmo === "Selection Sort") {
    for (let i = 0; i < arreglo.length - 1; i += 1) {
      let menor = i;
      for (let j = i + 1; j < arreglo.length; j += 1) {
        if (comparar(arreglo[j], arreglo[menor]) < 0) menor = j;
      }
      intercambiar(i, menor);
    }
  } else if (nombreAlgoritmo === "Insertion Sort") {
    for (let i = 1; i < arreglo.length; i += 1) {
      const valor = arreglo[i];
      let j = i - 1;
      while (j >= 0 && comparar(arreglo[j], valor) > 0) {
        arreglo[j + 1] = arreglo[j];
        j -= 1;
      }
      arreglo[j + 1] = valor;
    }
  } else if (nombreAlgoritmo === "Stooge Sort") {
    const ordenarStooge = (inicioIndice, finIndice) => {
      if (comparar(arreglo[inicioIndice], arreglo[finIndice]) > 0) {
        intercambiar(inicioIndice, finIndice);
      }
      if (finIndice - inicioIndice + 1 > 2) {
        const tercio = Math.floor((finIndice - inicioIndice + 1) / 3);
        ordenarStooge(inicioIndice, finIndice - tercio);
        ordenarStooge(inicioIndice + tercio, finIndice);
        ordenarStooge(inicioIndice, finIndice - tercio);
      }
    };
    if (arreglo.length > 1) ordenarStooge(0, arreglo.length - 1);
  } else if (nombreAlgoritmo === "Gnome Sort") {
    let i = 1;
    while (i < arreglo.length) {
      if (i === 0 || comparar(arreglo[i - 1], arreglo[i]) <= 0) {
        i += 1;
      } else {
        intercambiar(i - 1, i);
        i -= 1;
      }
    }
  } else if (nombreAlgoritmo === "Exchange Sort") {
    for (let i = 0; i < arreglo.length - 1; i += 1) {
      for (let j = i + 1; j < arreglo.length; j += 1) {
        if (comparar(arreglo[i], arreglo[j]) > 0) intercambiar(i, j);
      }
    }
  } else if (nombreAlgoritmo === "Merge Sort") {
    const ordenarMerge = (lista) => {
      if (lista.length < 2) return lista;
      const medio = Math.floor(lista.length / 2);
      const izquierda = ordenarMerge(lista.slice(0, medio));
      const derecha = ordenarMerge(lista.slice(medio));
      const resultado = [];
      let i = 0;
      let j = 0;
      while (i < izquierda.length && j < derecha.length) {
        if (comparar(izquierda[i], derecha[j]) <= 0) {
          resultado.push(izquierda[i]);
          i += 1;
        } else {
          resultado.push(derecha[j]);
          j += 1;
        }
      }
      return resultado.concat(izquierda.slice(i), derecha.slice(j));
    };
    arreglo.splice(0, arreglo.length, ...ordenarMerge(arreglo));
  } else if (nombreAlgoritmo === "Quick Sort") {
    const ordenarQuick = (inicioIndice, finIndice) => {
      if (inicioIndice >= finIndice) return;
      const pivote = arreglo[finIndice];
      let posicion = inicioIndice;
      for (let i = inicioIndice; i < finIndice; i += 1) {
        if (comparar(arreglo[i], pivote) < 0) {
          intercambiar(posicion, i);
          posicion += 1;
        }
      }
      intercambiar(posicion, finIndice);
      ordenarQuick(inicioIndice, posicion - 1);
      ordenarQuick(posicion + 1, finIndice);
    };
    ordenarQuick(0, arreglo.length - 1);
  }

  const tiempoMs = (performance.now() - inicio).toFixed(2);
  const algoritmo = algoritmos.find((item) => item.nombre === nombreAlgoritmo);

  return {
    arreglo,
    metricas: {
      comparaciones,
      intercambios,
      tiempoMs,
      pasos: comparaciones + intercambios,
      complejidad: algoritmo ? algoritmo.complejidad : "N/A",
    },
  };
}

export function ejecutarSimulacion() {
  if (algoritmosSeleccionados.length === 0) {
    alert("Selecciona al menos un algoritmo para ejecutar la simulación.");
    return;
  }

  const resultados = algoritmosSeleccionados.map((nombre) =>
    ordenarYMedir(nombre, valoresActuales)
  );

  resultados.forEach(({ metricas }, indice) => {
    metricasData[algoritmosSeleccionados[indice]] = metricas;
  });
  renderizarTarjetasMetricas();

  if (chartInstance) {
    chartInstance.data.labels = ["Comparaciones", "Intercambios", "Pasos"];
    chartInstance.data.datasets = resultados.map(({ metricas }, indice) => ({
      label: algoritmosSeleccionados[indice],
      data: [
        metricas.comparaciones,
        metricas.intercambios,
        metricas.pasos,
      ],
      borderColor: [
        "#ffffff", "#e74c3c", "#3498db", "#2ecc71",
        "#f1c40f", "#FFC0CB", "#800080", "#FFA500",
      ][indice % 8],
      backgroundColor: "transparent",
      tension: 0.2,
    }));
    chartInstance.update();
  }
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
});
