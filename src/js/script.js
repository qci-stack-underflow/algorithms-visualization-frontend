// src/js/script.js
import '../sass/style.scss';
import { MotorAnimacion } from './animador.js';

let valoresActuales = [10, 4, 8, 3, 7];
let motoresActivos = [];

function generarPasosMock(arr) {
  let array = [...arr];
  let pasos = [];
  let comparaciones = 0;
  let intercambios = 0;

  for (let i = 0; i < array.length - 1; i++) {
    for (let j = 0; j < array.length - i - 1; j++) {
      comparaciones++;
      pasos.push({
        tipo: 'comparacion',
        indices: [j, j + 1],
        arrayState: [...array],
        comparaciones,
        intercambios
      });

      if (array[j] > array[j + 1]) {
        let temp = array[j];
        array[j] = array[j + 1];
        array[j + 1] = temp;
        intercambios++;

        pasos.push({
          tipo: 'intercambio',
          indices: [j, j + 1],
          arrayState: [...array],
          comparaciones,
          intercambios
        });
      }
    }
  }

  pasos.push({
    tipo: 'completado',
    arrayState: [...array],
    comparaciones,
    intercambios
  });

  return pasos;
}

function obtenerAlgoritmosSeleccionados() {
  const checkboxes = document.querySelectorAll('.options-panel input[type="checkbox"]:checked, .sidebar input[type="checkbox"]:checked, input[type="checkbox"]:checked');
  const seleccionados = [];

  checkboxes.forEach(cb => {
    if (cb.id === 'compareToggle') return;
    const textoLabel = cb.parentElement ? cb.parentElement.textContent.trim() : cb.value;
    if (textoLabel) seleccionados.push(textoLabel);
  });

  return seleccionados.length > 0 ? seleccionados : ["Gnome Sort"];
}

function renderizarVistaPrevia() {
  motoresActivos.forEach(m => m.detener());
  motoresActivos = [];

  const container = document.getElementById("multiChartsContainer");
  if (!container) return;

  container.innerHTML = "";
  const algoritmos = obtenerAlgoritmosSeleccionados();

  algoritmos.forEach((nombreAlgo) => {
    const cardGroup = document.createElement("div");
    cardGroup.className = "single-chart-group";
    cardGroup.style.background = "#2a2a2a";
    cardGroup.style.borderRadius = "8px";
    cardGroup.style.padding = "16px";
    cardGroup.style.flex = "1";
    cardGroup.style.minWidth = "280px";

    const displayContainer = document.createElement("div");

    const title = document.createElement("div");
    title.className = "algorithm-title";
    title.style.textAlign = "center";
    title.style.fontWeight = "bold";
    title.style.marginTop = "10px";
    title.style.color = "#fff";
    title.innerText = nombreAlgo.toUpperCase();

    cardGroup.appendChild(displayContainer);
    cardGroup.appendChild(title);
    container.appendChild(cardGroup);

    const motor = new MotorAnimacion(displayContainer);
    motor.renderizarBarraEstado({
      tipo: 'inicial',
      arrayState: valoresActuales,
      indices: []
    });
  });
}

// Genera un nuevo conjunto aleatorio de elementos
window.generarElementosAleatorios = function() {
  const input = document.getElementById("elementsInput");
  const cantidad = input ? parseInt(input.value) || 5 : 5;
  valoresActuales = Array.from({ length: cantidad }, () => Math.floor(Math.random() * 45) + 5);
  renderizarVistaPrevia();
};

// Evento al presionar Insert
window.insertarElementosPersonalizados = function() {
  const inputCustom = document.getElementById("customElementsInput");
  
  // Si el usuario escribió un arreglo personalizado (ej: 10,4,8,3,7), lo toma
  if (inputCustom && inputCustom.value.trim() !== "") {
    const arr = inputCustom.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (arr.length > 0) {
      valoresActuales = arr;
    }
  } else {
    // Si no hay texto personalizado, genera una nueva lista aleatoria cada vez que hace click
    window.generarElementosAleatorios();
    return;
  }

  renderizarVistaPrevia();
};

// Ejecución de la comparación
window.ejecutarSimulacion = function() {
  motoresActivos.forEach(m => m.detener());
  motoresActivos = [];

  const container = document.getElementById("multiChartsContainer");
  if (!container) return;

  container.innerHTML = "";
  const algoritmos = obtenerAlgoritmosSeleccionados();

  algoritmos.forEach((nombreAlgo) => {
    const cardGroup = document.createElement("div");
    cardGroup.className = "single-chart-group";
    cardGroup.style.background = "#2a2a2a";
    cardGroup.style.borderRadius = "8px";
    cardGroup.style.padding = "16px";
    cardGroup.style.flex = "1";
    cardGroup.style.minWidth = "280px";

    const displayContainer = document.createElement("div");

    const title = document.createElement("div");
    title.className = "algorithm-title";
    title.style.textAlign = "center";
    title.style.fontWeight = "bold";
    title.style.marginTop = "10px";
    title.style.color = "#fff";
    title.innerText = nombreAlgo.toUpperCase();

    cardGroup.appendChild(displayContainer);
    cardGroup.appendChild(title);
    container.appendChild(cardGroup);

    const pasos = generarPasosMock([...valoresActuales]);
    const motor = new MotorAnimacion(displayContainer);
    motor.cargarPasos(pasos);
    motor.reproducir();

    motoresActivos.push(motor);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  renderizarVistaPrevia();

  const inputElements = document.getElementById("elementsInput");
  if (inputElements) {
    inputElements.addEventListener("change", window.generarElementosAleatorios);
  }

  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => renderizarVistaPrevia());
  });
});