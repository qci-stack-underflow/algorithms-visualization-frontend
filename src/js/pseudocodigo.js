// Panel de pseudocódigo del visualizador: muestra las líneas del algoritmo
// (vienen del backend en GET /algorithms/:id) y resalta la que ejecuta el
// paso que se está animando (`paso.linea`, que viene de `step.line`).
// Solo se usa con un único ordenamiento en pantalla; en una comparación se
// oculta porque no habría espacio para varios pseudocódigos.
import { nombreAId, obtenerAlgoritmo } from "./api.js";

const pseudocodigos = new Map(); // id del algoritmo → Promise de sus líneas
let algoritmoEnPanel = null; // algoritmo que el panel debe mostrar
let lineasDibujadas = null; // algoritmo cuyas líneas ya están en el panel

// Qué hizo cada tipo de paso, en palabras. Las posiciones van desde 0,
// igual que en el pseudocódigo.
const DESCRIPCIONES = {
  inicial: () => "Sin ejecutar",
  comparacion: ({ indices: [i, j] }) => `Compara A[${i}] con A[${j}]`,
  intercambio: ({ indices: [i, j] }) => `Intercambia A[${i}] y A[${j}]`,
  escritura: ({ indices: [i], arrayState }) => `Escribe ${arrayState[i]} en A[${i}]`,
  pivote: ({ indices: [i], arrayState }) => `Pivote: A[${i}] = ${arrayState[i]}`,
  completado: () => "Arreglo ordenado",
};

// Mismo color que la barra resaltada (clases .swatch--* del visualizador).
const MUESTRAS = {
  comparacion: "swatch--compare",
  intercambio: "swatch--swap",
  escritura: "swatch--write",
  pivote: "swatch--pivot",
  completado: "swatch--done",
};

function obtenerPseudocodigo(id) {
  if (!pseudocodigos.has(id)) {
    const lineas = obtenerAlgoritmo(id)
      .then((info) => info.pseudocode)
      .catch((error) => {
        pseudocodigos.delete(id); // se reintenta la próxima vez
        throw error;
      });
    pseudocodigos.set(id, lineas);
  }
  return pseudocodigos.get(id);
}

function describirPaso(paso, indice, total) {
  const muestra = document.getElementById("codeStepSwatch");
  const texto = document.getElementById("codeStepText");
  const contador = document.getElementById("codeCounter");

  muestra.className = `swatch ${MUESTRAS[paso.tipo] ?? ""}`;
  muestra.hidden = !MUESTRAS[paso.tipo];
  texto.textContent = DESCRIPCIONES[paso.tipo]?.(paso) ?? "";
  // El paso 0 es el estado inicial; los pasos animados van de 1 a total - 1.
  contador.textContent = total > 1 ? `${indice} / ${total - 1}` : "";
}

function dibujarLineas(lineas) {
  const lista = document.getElementById("codeLines");
  lista.innerHTML = "";
  lineas.forEach((linea) => {
    const item = document.createElement("li");
    item.textContent = linea; // textContent: el pseudocódigo trae "<" y ">"
    lista.appendChild(item);
  });
}

// Muestra el panel si hay exactamente un ordenamiento seleccionado y lo
// oculta en cualquier otro caso. Deja el panel sin línea resaltada.
export function mostrarPseudocodigo(seleccionados) {
  const panel = document.getElementById("codePanel");
  if (!panel) return;

  if (seleccionados.length !== 1) {
    panel.hidden = true;
    algoritmoEnPanel = null;
    return;
  }

  const [nombre] = seleccionados;
  algoritmoEnPanel = nombre;
  panel.hidden = false;
  document.getElementById("codePanelTitle").textContent = `Pseudocódigo · ${nombre}`;
  describirPaso({ tipo: "inicial" }, 0, 0);

  if (lineasDibujadas === nombre) {
    resaltarLinea(null);
    return;
  }

  lineasDibujadas = null;
  dibujarLineas([]);
  obtenerPseudocodigo(nombreAId(nombre))
    .then((lineas) => {
      if (algoritmoEnPanel !== nombre) return; // ya se eligió otro
      dibujarLineas(lineas);
      lineasDibujadas = nombre;
    })
    .catch(() => {
      if (algoritmoEnPanel !== nombre) return;
      document.getElementById("codeStepText").textContent =
        "No se pudo cargar el pseudocódigo.";
    });
}

function resaltarLinea(linea) {
  const lista = document.getElementById("codeLines");
  lista.querySelector(".is-active")?.classList.remove("is-active");
  if (linea !== null && linea !== undefined) {
    lista.children[linea]?.classList.add("is-active");
  }
}

// Se llama en cada paso de la animación (ver MotorAnimacion.reproducir).
export function resaltarPaso(paso, indice, total) {
  if (algoritmoEnPanel === null) return;
  resaltarLinea(paso.linea);
  describirPaso(paso, indice, total);
}
