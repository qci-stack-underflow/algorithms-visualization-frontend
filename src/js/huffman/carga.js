// Estados de la vista de proceso mientras se espera al backend: el avance de
// las fases (Descargar, Contar letras…) y un mensaje claro si algo falla.
// Uso (C2): mostrarCarga() al pedir el libro, terminarCarga() al recibir la
// respuesta y mostrarError(estadoHttp, reintentar) si la petición falla.
import { dibujarIconos, prefiereMenosMovimiento } from "../inicio.js";

// Al llegar la respuesta, las fases que faltan se marcan en orden con esta pausa.
const ENTRE_FASES_MS = 120;

// Qué pasó y qué puede hacer el usuario, según el estado HTTP del backend.
// 0 significa que no hubo respuesta (sin conexión o el servidor no contestó).
const ERRORES = {
  400: {
    titulo: "Ese libro no es válido",
    texto: "El número de libro no es correcto. Elige uno de la biblioteca.",
    reintentar: false,
  },
  404: {
    titulo: "No encontramos ese libro",
    texto:
      "Project Gutenberg no tiene un libro con ese número o no tiene su versión en texto plano. Elige otro libro de la biblioteca.",
    reintentar: false,
  },
  413: {
    titulo: "El libro es demasiado grande",
    texto: "Supera el tamaño máximo que se puede comprimir aquí. Elige un libro más corto.",
    reintentar: false,
  },
  504: {
    titulo: "Project Gutenberg tardó demasiado",
    texto: "No respondió a tiempo. Puede ser algo momentáneo: intenta de nuevo o elige otro libro.",
    reintentar: true,
  },
  0: {
    titulo: "No se pudo conectar",
    texto: "No hubo respuesta del servidor. Revisa tu conexión a internet e intenta de nuevo.",
    reintentar: true,
  },
};

const ERROR_INESPERADO = {
  titulo: "No se pudo comprimir el libro",
  texto: "Ocurrió un error inesperado en el servidor. Intenta de nuevo en unos momentos.",
  reintentar: true,
};

export function mensajeDeError(estado) {
  return ERRORES[estado] ?? ERROR_INESPERADO;
}

let temporizadores = [];

function cancelarTemporizadores() {
  temporizadores.forEach(clearTimeout);
  temporizadores = [];
}

const vista = () => document.getElementById("proceso");
const fases = () => [...document.querySelectorAll("[data-fases] [data-fase]")];

function ponerEstado(texto) {
  const estado = document.querySelector("[data-carga-estado]");
  if (estado) estado.textContent = texto;
}

// Las fases antes de `indiceActiva` quedan hechas, esa en curso y las demás
// pendientes. Con indiceActiva >= número de fases, todas quedan hechas.
function pintarFases(indiceActiva) {
  fases().forEach((fase, indice) => {
    const estado = indice < indiceActiva ? "hecha" : indice === indiceActiva ? "activa" : "pendiente";
    fase.classList.toggle("is-hecha", estado === "hecha");
    fase.classList.toggle("is-activa", estado === "activa");
    if (estado === "activa") fase.setAttribute("aria-current", "step");
    else fase.removeAttribute("aria-current");

    // El primer hijo es el ícono: palomita, indicador giratorio o punto vacío.
    fase.firstElementChild?.remove();
    let icono;
    if (estado === "hecha") {
      icono = document.createElement("i");
      icono.dataset.lucide = "check";
    } else {
      icono = document.createElement("span");
      icono.className = estado === "activa" ? "fase-spinner" : "fase-punto";
    }
    icono.setAttribute("aria-hidden", "true");
    fase.prepend(icono);
  });
  const lista = document.querySelector("[data-fases]");
  if (lista) dibujarIconos(lista);
}

function ocultarError() {
  const panel = document.querySelector("[data-huff-error]");
  if (panel) panel.hidden = true;
}

// El backend descarga y comprime en una sola respuesta, así que mientras
// llega solo se marca la primera fase como en curso.
export function mostrarCarga() {
  cancelarTemporizadores();
  ocultarError();
  vista().dataset.estado = "cargando";
  pintarFases(0);
  ponerEstado("Descargando el libro de Project Gutenberg y comprimiéndolo…");
}

// Marca las fases que faltan, en orden, y vuelve a mostrar los resultados.
// La promesa se cumple cuando todas están hechas.
export function terminarCarga() {
  cancelarTemporizadores();
  ocultarError();
  const total = fases().length;

  const terminar = () => {
    pintarFases(total);
    delete vista().dataset.estado;
    ponerEstado("");
  };

  if (prefiereMenosMovimiento()) {
    terminar();
    return Promise.resolve();
  }

  return new Promise((resolver) => {
    for (let indice = 1; indice < total; indice += 1) {
      temporizadores.push(setTimeout(() => pintarFases(indice), ENTRE_FASES_MS * indice));
    }
    temporizadores.push(
      setTimeout(() => {
        terminar();
        resolver();
      }, ENTRE_FASES_MS * total)
    );
  });
}

// Muestra qué falló y qué hacer. El botón Reintentar solo aparece si tiene
// sentido para ese error y se recibe la función que repite la petición.
export function mostrarError(estado, alReintentar) {
  cancelarTemporizadores();
  const { titulo, texto, reintentar } = mensajeDeError(estado);
  vista().dataset.estado = "error";
  ponerEstado("");

  const panel = document.querySelector("[data-huff-error]");
  panel.querySelector("[data-huff-error-titulo]").textContent = titulo;
  panel.querySelector("[data-huff-error-mensaje]").textContent = texto;

  const boton = panel.querySelector("[data-huff-reintentar]");
  const puedeReintentar = reintentar && typeof alReintentar === "function";
  boton.hidden = !puedeReintentar;
  boton.onclick = puedeReintentar ? () => alReintentar() : null;

  panel.hidden = false;
  // El foco pasa al título para que un lector de pantalla anuncie el error.
  panel.querySelector("[data-huff-error-titulo]").focus();
}

// Regresa la vista a su estado normal (por ejemplo, al cambiar de libro).
export function reiniciarCarga() {
  const proceso = vista();
  if (!proceso?.dataset.estado && temporizadores.length === 0) return;
  cancelarTemporizadores();
  ocultarError();
  delete proceso.dataset.estado;
  ponerEstado("");
  pintarFases(fases().length);
}
