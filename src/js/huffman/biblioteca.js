// Vista de la biblioteca: el campo de enlace abre cualquier libro de
// Project Gutenberg por su número.
import { ir } from "./navegacion.js";

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

export function iniciarBiblioteca() {
  iniciarEnlace();
}
