// Estados de una vista (proceso o binario) mientras se espera al backend: el
// avance de las fases (Descargar, Contar letras…; solo el proceso las tiene)
// y un mensaje claro si algo falla.
// Uso (datos.js): mostrarCarga(vista) al pedir el libro, terminarCarga(vista)
// al recibir la respuesta y mostrarError(estadoHttp, reintentar, vista) si la
// petición falla. `vista` es el id de la sección y por omisión es "proceso".
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

const seccion = (vista) => document.getElementById(vista);
const fases = (vista) => [...(seccion(vista)?.querySelectorAll("[data-fases] [data-fase]") ?? [])];

// Lo que se anuncia mientras carga, según la vista.
const TEXTO_DE_CARGA = {
  proceso: "Descargando el libro de Project Gutenberg y comprimiéndolo…",
  binario: "Preparando el archivo .suf…",
};

function ponerEstado(vista, texto) {
  const estado = seccion(vista)?.querySelector("[data-carga-estado]");
  if (estado) estado.textContent = texto;
}

// Las fases antes de `indiceActiva` quedan hechas, esa en curso y las demás
// pendientes. Con indiceActiva >= número de fases, todas quedan hechas.
function pintarFases(vista, indiceActiva) {
  const lista = fases(vista);
  if (lista.length === 0) return;
  lista.forEach((fase, indice) => {
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
  dibujarIconos(seccion(vista).querySelector("[data-fases]"));
}

function ocultarError(vista) {
  const panel = seccion(vista)?.querySelector("[data-huff-error]");
  if (panel) panel.hidden = true;
}

// El backend descarga y comprime en una sola respuesta, así que mientras
// llega solo se marca la primera fase como en curso.
export function mostrarCarga(vista = "proceso") {
  cancelarTemporizadores();
  ocultarError(vista);
  seccion(vista).dataset.estado = "cargando";
  pintarFases(vista, 0);
  ponerEstado(vista, TEXTO_DE_CARGA[vista] ?? TEXTO_DE_CARGA.proceso);
}

// Marca las fases que faltan, en orden, y vuelve a mostrar los resultados.
// La promesa se cumple cuando todas están hechas.
export function terminarCarga(vista = "proceso") {
  cancelarTemporizadores();
  ocultarError(vista);
  const total = fases(vista).length;

  const terminar = () => {
    pintarFases(vista, total);
    delete seccion(vista).dataset.estado;
    ponerEstado(vista, "");
  };

  if (prefiereMenosMovimiento() || total === 0) {
    terminar();
    return Promise.resolve();
  }

  return new Promise((resolver) => {
    for (let indice = 1; indice < total; indice += 1) {
      temporizadores.push(setTimeout(() => pintarFases(vista, indice), ENTRE_FASES_MS * indice));
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
export function mostrarError(estado, alReintentar, vista = "proceso") {
  cancelarTemporizadores();
  const { titulo, texto, reintentar } = mensajeDeError(estado);
  seccion(vista).dataset.estado = "error";
  ponerEstado(vista, "");

  const panel = seccion(vista).querySelector("[data-huff-error]");
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

// Regresa las vistas a su estado normal (por ejemplo, al cambiar de libro).
export function reiniciarCarga() {
  const conEstado = [...document.querySelectorAll(".vista[data-estado]")];
  if (conEstado.length === 0 && temporizadores.length === 0) return;
  cancelarTemporizadores();
  ["proceso", "binario"].forEach((vista) => {
    if (!seccion(vista)) return;
    ocultarError(vista);
    delete seccion(vista).dataset.estado;
    ponerEstado(vista, "");
    pintarFases(vista, fases(vista).length);
  });
}
