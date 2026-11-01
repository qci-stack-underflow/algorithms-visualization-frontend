// Vista de la biblioteca: las tarjetas salen de GET /huffman/books y el campo
// de enlace abre cualquier libro de Project Gutenberg por su número.
import { obtenerLibros } from "../api.js";
import { ir } from "./navegacion.js";
import { rutaA } from "./rutas.js";

const COLORES_PORTADA = ["azul", "hueso", "tinta"];
const ARTICULOS = /^(the|a|an|el|la|los|las|le|les)\s+/i;
const PARTICULAS = new Set(["de", "del", "van", "von", "da", "di"]);

// Rutas de gutenberg.org que llevan el número del libro:
//   /ebooks/2000, /ebooks/2000.txt.utf-8, /cache/epub/2000/pg2000.txt,
//   /epub/2000/… y /files/2000/2000-0.txt
const RUTA_GUTENBERG = /^\/(?:ebooks|(?:cache\/)?epub|files)\/(\d+)(?=[/.]|$)/;

const MENSAJES = {
  vacio: "Pega el enlace de un libro de Project Gutenberg, por ejemplo https://www.gutenberg.org/ebooks/2000.",
  sitio: "Ese enlace no es de Project Gutenberg. Copia el enlace de la página del libro en gutenberg.org.",
  numero: "No encontramos el número del libro en el enlace. Debe verse como https://www.gutenberg.org/ebooks/2000.",
};

const aNumero = (texto) => {
  const numero = Number(texto);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
};

// Devuelve { libro } con el número del libro, o { error } con la clave del
// mensaje. También acepta solo el número ("2000") o el enlace sin https://.
export function leerEnlace(texto) {
  const limpio = (texto ?? "").trim();
  if (!limpio) return { error: "vacio" };
  if (/^#?\d+$/.test(limpio)) {
    const libro = aNumero(limpio.replace("#", ""));
    return libro ? { libro } : { error: "numero" };
  }

  let url;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return { error: "sitio" };
  }
  if (!/^https?:$/.test(url.protocol) || !/(^|\.)gutenberg\.org$/i.test(url.hostname)) {
    return { error: "sitio" };
  }

  const libro = aNumero(RUTA_GUTENBERG.exec(url.pathname)?.[1]);
  return libro ? { libro } : { error: "numero" };
}

// "Don Quijote" → "D"; "The Adventures of…" → "A" (sin el artículo)
function inicial(titulo) {
  return titulo.replace(ARTICULOS, "").trim().charAt(0).toUpperCase() || "?";
}

// "Miguel de Cervantes Saavedra" → "Cervantes"; "Jane Austen" → "Austen"
function apellido(autor) {
  const palabras = autor.trim().split(/\s+/);
  const particula = palabras.findIndex((palabra) => PARTICULAS.has(palabra.toLowerCase()));
  if (particula >= 0 && particula < palabras.length - 1) return palabras[particula + 1];
  return palabras.at(-1) ?? "";
}

function elemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

// Misma estructura que las tarjetas de huffman.html. Todo se pone con
// textContent: los títulos vienen del backend.
function crearTarjeta(libro, indice) {
  const tarjeta = elemento("a", "libro");
  tarjeta.href = rutaA("proceso", libro.id);
  tarjeta.dataset.libro = String(libro.id);

  const portada = elemento("div", `libro-portada libro-portada--${COLORES_PORTADA[indice % COLORES_PORTADA.length]}`);
  portada.setAttribute("aria-hidden", "true");
  portada.append(
    elemento("span", "libro-portada-inicial", inicial(libro.title)),
    elemento("span", "libro-portada-autor", apellido(libro.author))
  );

  const datos = elemento("div", "libro-datos");
  if (libro.language) datos.append(elemento("span", "chip-dato", libro.language));
  if (libro.size) datos.append(elemento("span", "chip-dato", libro.size));
  datos.append(elemento("span", "libro-id", `#${libro.id}`));

  const info = elemento("div", "libro-info");
  info.append(elemento("h3", "", libro.title), elemento("p", "", libro.author), datos);

  tarjeta.append(portada, info);
  return tarjeta;
}

function dibujarLibros(libros) {
  const lista = document.querySelector("[data-libros]");
  if (!lista || !Array.isArray(libros) || libros.length === 0) return;

  // Si el foco estaba en una tarjeta, pasa a la nueva del mismo libro.
  const enfocado = document.activeElement?.closest?.("[data-libros] .libro")?.dataset.libro;
  lista.replaceChildren(...libros.map(crearTarjeta));
  if (enfocado) lista.querySelector(`.libro[data-libro="${enfocado}"]`)?.focus({ preventScroll: true });

  const cuenta = document.querySelector("[data-libros-cuenta]");
  if (cuenta) cuenta.textContent = `${libros.length} ${libros.length === 1 ? "libro" : "libros"}`;
}

function iniciarEnlace() {
  const formulario = document.querySelector("[data-enlace-libro]");
  if (!formulario) return;
  const campo = formulario.querySelector("input");
  const error = document.querySelector("[data-enlace-error]");
  const nota = document.querySelector("[data-enlace-nota]");

  const mostrarError = (clave) => {
    error.textContent = clave ? MENSAJES[clave] : "";
    error.hidden = !clave;
    nota.hidden = Boolean(clave);
    if (clave) campo.setAttribute("aria-invalid", "true");
    else campo.removeAttribute("aria-invalid");
  };

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const { libro, error: clave } = leerEnlace(campo.value);
    if (clave) {
      mostrarError(clave);
      campo.focus();
      return;
    }
    mostrarError(null);
    campo.value = "";
    ir("proceso", libro);
  });
  // El aviso se quita en cuanto el usuario corrige el enlace.
  campo.addEventListener("input", () => {
    if (!error.hidden) mostrarError(null);
  });
}

// Si el catálogo no llega (por ejemplo, el backend todavía no tiene las rutas
// de Huffman), se quedan las tarjetas escritas en huffman.html.
export async function iniciarBiblioteca() {
  iniciarEnlace();
  try {
    dibujarLibros(await obtenerLibros());
  } catch {
    // Las tarjetas del HTML son los mismos seis libros del catálogo.
  }
}
