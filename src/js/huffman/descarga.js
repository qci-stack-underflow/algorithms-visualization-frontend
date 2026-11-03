// Botones "Descargar .suf" del proceso y del binario: guardan el archivo que
// arma el backend (GET /huffman/books/:id/file, ver descargarSuf en api.js)
// con un Blob y un enlace temporal. Los bytes quedan guardados, así que la
// vista binaria (C7) no los vuelve a pedir.
import { descargarSuf } from "../api.js";
import { enModoEjemplo } from "./datos.js";
import { leerRuta } from "./rutas.js";
import { formatearBytes } from "./formato.js";

function guardarArchivo(bytes, nombre) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.hidden = true;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Firefox necesita la URL un momento después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mensajeDeFallo(error) {
  if (enModoEjemplo()) {
    return "La descarga estará disponible cuando el backend comprima los libros.";
  }
  if (error.estado === 0) {
    return "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
  }
  return "No se pudo descargar el archivo. Intenta de nuevo en unos momentos.";
}

async function descargar(boton) {
  // aria-disabled en lugar de disabled: así el botón no pierde el foco.
  if (boton.getAttribute("aria-disabled") === "true") return;
  const libro = leerRuta(location.hash)?.libro;
  if (!libro) return;

  const estado = document.getElementById(boton.dataset.descargar);
  const texto = boton.querySelector("[data-descargar-texto]");
  const textoOriginal = texto.textContent;
  // El nombre es el que se ve en la página (don-quijote.suf).
  const nombre = document.querySelector("[data-libro-archivo]")?.textContent.trim() || `libro-${libro}.suf`;

  boton.setAttribute("aria-disabled", "true");
  texto.textContent = "Descargando…";
  estado.textContent = "";
  estado.classList.remove("is-error");
  try {
    const bytes = await descargarSuf(libro);
    guardarArchivo(bytes, nombre);
    estado.textContent = `Se descargó ${nombre} (${formatearBytes(bytes.byteLength)}).`;
  } catch (error) {
    estado.textContent = mensajeDeFallo(error);
    estado.classList.add("is-error");
  } finally {
    boton.removeAttribute("aria-disabled");
    texto.textContent = textoOriginal;
  }
}

// Al cambiar de libro o de vista se borra el aviso de la última descarga.
export function limpiarAvisosDeDescarga() {
  document.querySelectorAll("[data-descarga-estado]").forEach((estado) => {
    estado.textContent = "";
    estado.classList.remove("is-error");
  });
}

export function iniciarDescargas() {
  document.querySelectorAll("[data-descargar]").forEach((boton) => {
    boton.addEventListener("click", () => descargar(boton));
  });
}
