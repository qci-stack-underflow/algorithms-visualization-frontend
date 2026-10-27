// Muestra la vista de la ruta actual (biblioteca, proceso o binario) y la
// llena con los datos del libro que viene en la ruta.
import { leerRuta, rutaA } from "./rutas.js";

const TITULO_PAGINA = "Huffman · StackUnderFlow";
// Las cifras, el árbol y los bits fijos de la página son de Don Quijote.
const LIBRO_DE_EJEMPLO = 2000;

// "Pride and Prejudice" → "pride-and-prejudice.suf"
export function nombreDeArchivo(titulo) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "libro"}.suf`;
}

// Por ahora los datos del libro salen de su tarjeta en la biblioteca;
// con C3 vendrán de GET /huffman/books.
function datosDelLibro(numero) {
  const tarjeta = document.querySelector(`.libro[data-libro="${numero}"]`);
  if (!tarjeta) {
    return { titulo: `Libro #${numero}`, autor: "Autor desconocido" };
  }
  return {
    titulo: tarjeta.querySelector(".libro-info h3").textContent.trim(),
    autor: tarjeta.querySelector(".libro-info p").textContent.trim(),
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

function mostrar({ vista, libro }, esCargaInicial) {
  document.querySelectorAll(".vista").forEach((seccion) => {
    seccion.hidden = seccion.id !== vista;
  });

  let titulo = TITULO_PAGINA;
  if (libro !== null) {
    const datos = llenarLibro(libro);
    titulo = `${vista === "binario" ? datos.archivo : datos.titulo} · ${TITULO_PAGINA}`;
  }
  document.title = titulo;

  window.scrollTo(0, 0);
  // Al cambiar de vista, el foco pasa al título para que un lector de
  // pantalla anuncie la vista nueva. En la carga inicial no se mueve.
  if (!esCargaInicial) {
    document.getElementById(vista)?.querySelector("h1")?.focus({ preventScroll: true });
  }
}

function alCambiarRuta(esCargaInicial) {
  const ruta = leerRuta(location.hash);

  // Una ruta inválida (p. ej. #/libro/abc) se reemplaza por la biblioteca
  // sin dejar una entrada extra en el historial.
  if (!ruta) {
    history.replaceState(null, "", rutaA("biblioteca"));
    mostrar({ vista: "biblioteca", libro: null }, esCargaInicial);
    return;
  }

  // #/libro/02000 o #/libro/2000/ quedan como #/libro/2000.
  const canonica = rutaA(ruta.vista, ruta.libro);
  if (location.hash && location.hash !== canonica) {
    history.replaceState(null, "", canonica);
  }
  mostrar(ruta, esCargaInicial);
}

export function iniciarNavegacion() {
  window.addEventListener("hashchange", () => alCambiarRuta(false));
  alCambiarRuta(true);
}
