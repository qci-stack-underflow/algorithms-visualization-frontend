// Navegación de la pantalla de Huffman: muestra la vista de la ruta actual
// (biblioteca, proceso o binario), la llena con los datos del libro y cuida
// el scroll, el foco y el historial. Las rutas se leen y arman en rutas.js.
import { leerRuta, rutaA } from "./rutas.js";
import { reiniciarCarga } from "./carga.js";

// Las cifras, el árbol y los bits fijos de la página son de Don Quijote.
const LIBRO_DE_EJEMPLO = 2000;

let tituloPagina = ""; // el <title> de huffman.html, leído al iniciar
let rutaActual = null; // la última ruta mostrada
let temporizadorScroll = 0;

// "Pride and Prejudice" → "pride-and-prejudice.suf"
export function nombreDeArchivo(titulo) {
  const base = titulo
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // quita los acentos que NFD separó de su letra
    .toLowerCase()
    .replace(/['’]/g, "") // "Alice's" → "alices"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "libro"}.suf`;
}

// Por ahora los datos del libro salen de su tarjeta en la biblioteca;
// con C3 vendrán de GET /huffman/books.
function datosDelLibro(numero) {
  const tarjeta = document.querySelector(`.libro[data-libro="${numero}"]`);
  const texto = (selector) => tarjeta?.querySelector(selector)?.textContent.trim();
  return {
    titulo: texto(".libro-info h3") || `Libro #${numero}`,
    autor: texto(".libro-info p") || "Autor desconocido",
  };
}

function llenarLibro(numero) {
  const { titulo, autor } = datosDelLibro(numero);
  const archivo = nombreDeArchivo(titulo);
  const poner = (selector, texto) =>
    document.querySelectorAll(selector).forEach((elemento) => {
      elemento.textContent = texto;
    });

  poner("[data-libro-titulo]", titulo);
  poner("[data-libro-autor]", autor);
  poner("[data-libro-numero]", String(numero));
  poner("[data-libro-archivo]", archivo);

  // Los enlaces entre proceso y binario apuntan al mismo libro.
  document.querySelectorAll("[data-ir]").forEach((enlace) => {
    enlace.href = rutaA(enlace.dataset.ir, numero);
  });
  document.querySelectorAll("[data-aviso-ejemplo]").forEach((aviso) => {
    aviso.hidden = numero === LIBRO_DE_EJEMPLO;
  });

  return { titulo, archivo };
}

// Cada entrada del historial guarda su scroll en history.state: Atrás y
// Adelante regresan a donde estaba el usuario, y una entrada nueva (un
// enlace) empieza arriba.
function guardarScroll() {
  try {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, "");
  } catch {
    // Safari limita las llamadas seguidas a replaceState; basta con la siguiente.
  }
}

function guardarScrollAlDetenerse() {
  clearTimeout(temporizadorScroll);
  temporizadorScroll = setTimeout(guardarScroll, 150);
}

// Devuelve true si regresó a un scroll guardado.
function ajustarScroll() {
  const guardado = history.state?.scrollY;
  const restaurado = typeof guardado === "number";
  // "instant": _base.scss tiene scroll-behavior: smooth y la vista nueva
  // se vería deslizarse desde la posición anterior.
  window.scrollTo({ top: restaurado ? guardado : 0, behavior: "instant" });
  return restaurado;
}

function enfocar(vista, rutaAnterior, scrollRestaurado) {
  // Al volver a la biblioteca, el foco regresa a la tarjeta del libro que se
  // abrió, para no recorrer de nuevo toda la página con el teclado.
  if (vista === "biblioteca" && rutaAnterior?.libro) {
    const tarjeta = document.querySelector(`.libro[data-libro="${rutaAnterior.libro}"]`);
    if (tarjeta) {
      tarjeta.focus({ preventScroll: scrollRestaurado });
      return;
    }
  }
  // Si no, el foco pasa al título para que un lector de pantalla anuncie la vista.
  document.getElementById(vista)?.querySelector("h1")?.focus({ preventScroll: true });
}

function mostrar(ruta, esCargaInicial) {
  const { vista, libro } = ruta;
  const rutaAnterior = rutaActual;
  rutaActual = ruta;

  // Ya no hace falta la marca del <head> que evitaba pintar la vista equivocada.
  document.documentElement.removeAttribute("data-ruta-inicial");
  // Una carga o un error del libro anterior no deben quedarse en la vista nueva.
  reiniciarCarga();
  document.querySelectorAll(".vista").forEach((seccion) => {
    seccion.hidden = seccion.id !== vista;
  });

  let titulo = tituloPagina;
  if (libro !== null) {
    const datos = llenarLibro(libro);
    titulo = `${vista === "binario" ? datos.archivo : datos.titulo} · ${tituloPagina}`;
  }
  document.title = titulo;

  const scrollRestaurado = ajustarScroll();
  // En la carga inicial el foco no se mueve.
  if (!esCargaInicial) enfocar(vista, rutaAnterior, scrollRestaurado);
}

function alCambiarRuta(esCargaInicial) {
  // Una ruta inválida (p. ej. #/libro/abc) lleva a la biblioteca.
  const ruta = leerRuta(location.hash) ?? { vista: "biblioteca", libro: null };
  const canonica = rutaA(ruta.vista, ruta.libro);
  const sinHashEnBiblioteca = !location.hash && ruta.vista === "biblioteca";

  if (location.hash !== canonica && !sinHashEnBiblioteca) {
    // Si la ruta escrita a mano lleva a la misma vista que ya se mostraba
    // (#/libro/2000/ desde #/libro/2000), reemplazarla dejaría dos entradas
    // iguales y un Atrás que no hace nada: se regresa a la anterior.
    if (!esCargaInicial && rutaActual && rutaA(rutaActual.vista, rutaActual.libro) === canonica) {
      history.back();
      return;
    }
    // #/libro/02000, #/libro/2000/ o #proceso quedan como su ruta canónica.
    history.replaceState(history.state, "", canonica);
  }
  mostrar(ruta, esCargaInicial);
}

export function iniciarNavegacion() {
  tituloPagina = document.title;
  // El scroll de cada vista lo restaura ajustarScroll(), no el navegador.
  history.scrollRestoration = "manual";

  window.addEventListener("scroll", guardarScrollAlDetenerse, { passive: true });
  // Antes de seguir un enlace interno, guarda el scroll en la entrada que se deja.
  document.addEventListener(
    "click",
    (evento) => {
      if (evento.target.closest?.('a[href^="#"]')) guardarScroll();
    },
    true
  );
  window.addEventListener("pagehide", guardarScroll);
  window.addEventListener("hashchange", () => alCambiarRuta(false));

  alCambiarRuta(true);
}
