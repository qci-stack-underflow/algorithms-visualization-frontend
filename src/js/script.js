import "@sass/style.scss";
import Chart from "chart.js/auto";
import { MotorAnimacion } from "./animador.js";
import { compararAlgoritmos, ejecutarAlgoritmo, nombreAId } from "./api.js";
import { dibujarIconos, iniciarPantallaInicio } from "./inicio.js";
import { convertirPasos } from "./pasos.js";
import { mostrarPseudocodigo, resaltarPaso } from "./pseudocodigo.js";
import { coloresSeries, leerVariable } from "./tema.js";
import { crearVistaPreviaHuffman } from "./vista-huffman.js";
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

// Algoritmos que no son ordenamientos. Cada uno tendrá su propia pantalla;
// por ahora el enlace es provisional.
export const otrosAlgoritmos = [
  {
    nombre: "Algoritmo de Huffman",
    complejidad: "O(n log n)",
    descripcion:
      "Comprime un texto asignando códigos binarios más cortos a las letras que más se repiten.",
    etiquetas: ["Voraz", "Compresión"],
    enlace: "#",
    vistaPrevia: crearVistaPreviaHuffman,
  },
];

// Estado de la aplicación
const MAX_ELEMENTOS = 50;
let filtroComplejidad = "ALL";
let valoresActuales = [10, 4, 8, 3, 7];
let algoritmosSeleccionados = ["Bubble Sort"];
let chartInstance = null;
let metricasData = {};
let motores = []; // un MotorAnimacion por algoritmo seleccionado

// Vista previa animada de cada tarjeta del inicio (en lugar de un GIF):
// se pide al backend la ordenación de un arreglo pequeño y se repite en bucle.
const ARREGLO_VISTA_PREVIA = [5, 3, 6, 1, 4, 2];
const VELOCIDAD_VISTA_PREVIA_MS = 150;
const PAUSA_ENTRE_VUELTAS_MS = 1200;
const pasosVistaPrevia = new Map(); // nombre del algoritmo → Promise de pasos
let motoresTarjetas = [];
let generacionTarjetas = 0; // invalida las vistas previas de un render anterior

function detenerVistasPrevias() {
  generacionTarjetas += 1;
  motoresTarjetas.forEach((motor) => motor.detener());
  motoresTarjetas = [];
}

function obtenerPasosVistaPrevia(nombre) {
  if (!pasosVistaPrevia.has(nombre)) {
    const pasos = ejecutarAlgoritmo(nombreAId(nombre), ARREGLO_VISTA_PREVIA)
      .then(convertirPasos)
      .catch((error) => {
        pasosVistaPrevia.delete(nombre); // se reintenta en el siguiente render
        throw error;
      });
    pasosVistaPrevia.set(nombre, pasos);
  }
  return pasosVistaPrevia.get(nombre);
}

function iniciarVistaPrevia(contenedor, nombre, generacion) {
  // Mientras llegan los pasos (o si no hay backend) se ve el arreglo inicial.
  const motor = new MotorAnimacion(contenedor, {
    altura: "136px",
    mostrarValores: false,
  });
  motor.velocidadMs = VELOCIDAD_VISTA_PREVIA_MS;
  motor.renderizarBarraEstado({
    tipo: "inicial",
    indices: [],
    arrayState: ARREGLO_VISTA_PREVIA,
  });
  motoresTarjetas.push(motor);

  obtenerPasosVistaPrevia(nombre)
    .then((pasos) => {
      if (generacion !== generacionTarjetas) return;

      motor.cargarPasos(pasos);

      const ultimo = pasos[pasos.length - 1];
      const reproducirVuelta = () =>
        motor.reproducir((paso) => {
          if (paso !== ultimo) return;
          setTimeout(() => {
            if (generacion !== generacionTarjetas) return;
            motor.detener();
            reproducirVuelta();
          }, PAUSA_ENTRE_VUELTAS_MS);
        });
      reproducirVuelta();
    })
    .catch(() => {
      // Sin backend se queda el arreglo inicial.
    });
}

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

// Arma el contenido común de una tarjeta del inicio y devuelve el recuadro
// donde va su vista previa.
function crearTarjeta(card, alg, indice) {
  card.classList.add("card");
  card.style.setProperty("--i", indice);

  const gifContainer = document.createElement("div");
  gifContainer.className = "card-preview";

  const etiquetas = (alg.etiquetas ?? [])
    .map((etiqueta) => `<span class="tag">${etiqueta}</span>`)
    .join("");

  const cardInfo = document.createElement("div");
  cardInfo.className = "card-info";
  cardInfo.innerHTML = `
    <div class="card-head">
      <h3 class="card-title">${alg.nombre}</h3>
      <i data-lucide="arrow-up-right" class="card-arrow"></i>
    </div>
    <p class="card-desc">${alg.descripcion}</p>
    <div class="card-tags">
      <span class="card-complexity">${alg.complejidad}</span>
      ${etiquetas}
    </div>
  `;

  card.appendChild(gifContainer);
  card.appendChild(cardInfo);
  return gifContainer;
}

function renderizarOrdenamientos(lista, generacion) {
  const grid = document.getElementById("algorithmsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        No se encontraron ordenamientos parecidos. Intenta de nuevo.
      </div>
    `;
    return;
  }

  lista.forEach((alg, indice) => {
    const card = document.createElement("article");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Abrir ${alg.nombre}`);

    // Asignación de evento mediante listener
    card.addEventListener("click", () => abrirVisualizador(alg.nombre));
    card.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      abrirVisualizador(alg.nombre);
    });

    const gifContainer = crearTarjeta(card, alg, indice);

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
      iniciarVistaPrevia(gifContainer, alg.nombre, generacion);
    }

    grid.appendChild(card);
  });

  dibujarIconos(grid);
}

function renderizarOtrosAlgoritmos(lista, generacion) {
  const seccion = document.getElementById("algoritmos");
  const grid = document.getElementById("otherAlgorithmsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  // Si la búsqueda no deja ninguno, se oculta el bloque completo.
  if (seccion) seccion.hidden = lista.length === 0;

  lista.forEach((alg, indice) => {
    const card = document.createElement("a");
    card.href = alg.enlace;

    const gifContainer = crearTarjeta(card, alg, indice);
    alg.vistaPrevia?.(gifContainer, () => generacion === generacionTarjetas);

    grid.appendChild(card);
  });

  dibujarIconos(grid);
}

// La búsqueda aplica a los dos bloques; el filtro de complejidad, solo a
// los ordenamientos (sus chips están en ese bloque).
function filtrarAlgoritmos() {
  const inputSearch = document.getElementById("searchInput");
  const textoBusqueda = inputSearch ? inputSearch.value.toLowerCase() : "";

  const coincideTexto = (alg) =>
    alg.nombre.toLowerCase().includes(textoBusqueda) ||
    alg.descripcion.toLowerCase().includes(textoBusqueda);

  const ordenamientos = algoritmos.filter(
    (alg) =>
      coincideTexto(alg) &&
      (filtroComplejidad === "ALL" || alg.complejidad === filtroComplejidad)
  );
  const otros = otrosAlgoritmos.filter(coincideTexto);

  detenerVistasPrevias();
  const generacion = generacionTarjetas;
  renderizarOrdenamientos(ordenamientos, generacion);
  renderizarOtrosAlgoritmos(otros, generacion);
}

function seleccionarFiltroComplejidad(evento) {
  const chip = evento.target.closest(".chip");
  if (!chip) return;

  filtroComplejidad = chip.dataset.valor;
  document.querySelectorAll("#complexityFilter .chip").forEach((otro) => {
    const activo = otro === chip;
    otro.classList.toggle("is-active", activo);
    otro.setAttribute("aria-checked", String(activo));
  });

  filtrarAlgoritmos();
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
  detenerVistasPrevias();
  document.getElementById("mainHeader").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("mainFooter").style.display = "none";
  document.getElementById("visualizerScreen").style.display = "block";
  window.scrollTo(0, 0);

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
  document.getElementById("mainFooter").style.display = "block";
  filtrarAlgoritmos(); // vuelve a dibujar las tarjetas y sus vistas previas
  // Regresa al catálogo de ordenamientos, de donde se abrió el visualizador.
  document.getElementById("ordenamientos")?.scrollIntoView({ behavior: "instant" });
}

function dibujarBarras() {
  const container = document.getElementById("multiChartsContainer");
  if (!container) return;

  motores.forEach((motor) => motor.detener());
  motores = [];
  container.innerHTML = "";

  const selectVelocidad = document.getElementById("selectVelocidad");
  const colores = coloresSeries();

  algoritmosSeleccionados.forEach((nombreAlgo, idx) => {
    const chartGroup = document.createElement("div");
    chartGroup.className = "single-chart-group";
    // Mismo color que su serie en la gráfica y su tarjeta de métricas.
    chartGroup.style.setProperty("--color-serie", colores[idx % colores.length]);

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

  // Con un solo ordenamiento se muestra su pseudocódigo; si hay varios, se oculta.
  mostrarPseudocodigo(algoritmosSeleccionados);
}

function renderizarTarjetasMetricas() {
  const container = document.getElementById("metricsCardsContainer");
  if (!container) return;
  
  container.innerHTML = "";

  const colores = coloresSeries();

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

  const textoSecundario = leerVariable("--text-secondary");
  const textoTenue = leerVariable("--text-muted");
  const borde = leerVariable("--border");
  Chart.defaults.font.family = leerVariable("--font-body");

  // Barras agrupadas: cada métrica es una categoría y cada algoritmo una
  // serie, así se comparan lado a lado con los mismos datos.
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          // Solo con dos o más series; con una, el título ya la nombra.
          display: false,
          align: "start",
          labels: {
            color: textoSecundario,
            boxWidth: 10,
            boxHeight: 10,
            useBorderRadius: true,
            borderRadius: 2,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: leerVariable("--text-primary"),
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
        },
      },
      scales: {
        x: {
          ticks: { color: textoSecundario },
          grid: { display: false },
          border: { color: borde },
        },
        y: {
          ticks: { color: textoTenue, precision: 0 },
          grid: { color: borde },
          border: { display: false },
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
    const colores = coloresSeries();
    chartInstance.data.labels = ["Comparaciones", "Intercambios", "Pasos"];
    chartInstance.data.datasets = resultados.map(({ metrics }, indice) => ({
      label: algoritmosSeleccionados[indice],
      data: [metrics.comparisons, metrics.swaps, metrics.steps],
      backgroundColor: colores[indice % colores.length],
      borderRadius: 4,
      maxBarThickness: 36,
      categoryPercentage: 0.7,
      barPercentage: 0.88,
    }));
    chartInstance.options.plugins.legend.display = resultados.length > 1;
    chartInstance.update();
  }

  // Cada algoritmo se anima a la vez sobre su copia del mismo arreglo.
  dibujarBarras();
  const unSoloOrdenamiento = resultados.length === 1;
  resultados.forEach((resultado, indice) => {
    const pasos = convertirPasos(resultado);
    motores[indice].cargarPasos(pasos);
    // El pseudocódigo solo sigue la animación cuando hay un único ordenamiento.
    motores[indice].reproducir(
      unSoloOrdenamiento ? (paso, i) => resaltarPaso(paso, i, pasos.length) : undefined
    );
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
  iniciarPantallaInicio();
  filtrarAlgoritmos(); // dibuja los dos bloques de tarjetas

  // Vincular eventos a inputs/botones del DOM para evitar inline 'onclick' u 'onchange'
  document.getElementById("searchInput")?.addEventListener("input", filtrarAlgoritmos);
  document.getElementById("complexityFilter")?.addEventListener("click", seleccionarFiltroComplejidad);
  document.getElementById("elementsInput")?.addEventListener("change", generarElementosAleatorios);
  document.getElementById("compareToggle")?.addEventListener("change", actualizarEstadoComparacion);
  document.getElementById("btnBack")?.addEventListener("click", regresarAlInicio);
  document.getElementById("btnCustom")?.addEventListener("click", insertarElementosPersonalizados);
  document.getElementById("btnSimulate")?.addEventListener("click", ejecutarSimulacion);
  document.getElementById("btnReiniciar")?.addEventListener("click", reiniciarSimulacion);
  document.getElementById("selectVelocidad")?.addEventListener("change", cambiarVelocidad);
});
