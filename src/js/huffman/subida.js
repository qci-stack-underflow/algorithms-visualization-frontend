// Subir un .txt propio (requerimientos, sección 2A): se valida en el
// navegador, se envía a POST /huffman/compress/file y, al recibir el
// resultado y el .suf, se descomprime el .suf aquí mismo y se compara con el
// archivo subido (integridad, sección 8). Mientras el backend no tenga esa
// ruta, el archivo se comprime en el navegador (modo ejemplo, compresor.js).
// El resultado vive solo mientras la página siga abierta, en las rutas
// #/archivo y #/archivo/binario.
import { comprimirArchivo } from "../api.js";
import { mostrarCarga, mostrarError, terminarCarga } from "./carga.js";
import { comprimirEnNavegador, leerTexto } from "./compresor.js";
import { formatearBytes } from "./formato.js";
import { leerRuta } from "./rutas.js";
import { compararConOriginal, descomprimir, leerSuf, reconstruirArbol } from "./suf.js";

// Vercel limita a 4.5 MB el cuerpo de la petición; con el encabezado del
// formulario, 4 MB de texto caben con holgura (ver backend#53).
export const LIMITE_DE_SUBIDA = 4 * 1024 * 1024;

let pendiente = null; // File que espera la respuesta del backend
let subido = null; // { nombre, resultado, bytesSuf, integridad }

export const archivoSubido = () => subido;

// Devuelve qué falla del archivo, o null si se puede subir.
export function validarArchivo(archivo) {
  if (!archivo) return "Elige un archivo .txt.";
  if (!/\.txt$/i.test(archivo.name) && archivo.type !== "text/plain") {
    return `${archivo.name} no es un archivo .txt. Elige un archivo de texto plano.`;
  }
  if (archivo.size === 0) return `${archivo.name} está vacío.`;
  if (archivo.size > LIMITE_DE_SUBIDA) {
    return `${archivo.name} pesa ${formatearBytes(archivo.size)}; el máximo para subir es 4 MB.`;
  }
  return null;
}

// Guarda el archivo elegido; se envía al abrir #/archivo.
export function prepararSubida(archivo) {
  pendiente = archivo;
  subido = null;
}

// Descomprime el .suf recibido y lo compara con el archivo original.
function comprobarIntegridad(original, bytesSuf) {
  try {
    const suf = leerSuf(bytesSuf);
    const texto = descomprimir(suf, reconstruirArbol(suf.encabezado.dictionary));
    return compararConOriginal(texto, original);
  } catch (error) {
    return { identico: false, error: error.message };
  }
}

const sigueAbierto = () => leerRuta(location.hash)?.archivo === true;

// Estados con los que el backend dice que todavía no tiene la subida: sin la
// ruta (404, 405) o con la ruta declarada pero sin implementar (501).
const SIN_SUBIDA_EN_EL_BACKEND = new Set([404, 405, 501]);

// Comprime en el backend y, si todavía no tiene la subida, en el navegador
// con la misma implementación (compresor.js); `local` dice cuál se usó.
async function comprimir(archivo, original) {
  try {
    return { ...(await comprimirArchivo(archivo)), local: false };
  } catch (error) {
    if (!SIN_SUBIDA_EN_EL_BACKEND.has(error.estado)) throw error;
    const titulo = archivo.name.replace(/\.txt$/i, "");
    const datos = { titulo, archivo: { nombre: archivo.name, bytes: original.byteLength } };
    return { ...comprimirEnNavegador(leerTexto(original), datos), local: true };
  }
}

// Llena la vista con el archivo subido. `alCargar(subido)` recibe
// { nombre, resultado, bytesSuf, local, integridad }; si todavía no hay
// respuesta, se muestra la carga y los errores de carga.js.
export async function cargarArchivo(vista, alCargar) {
  if (subido) {
    alCargar(subido);
    return;
  }
  if (!pendiente) {
    mostrarError("sin-archivo", undefined, vista, "archivo");
    return;
  }

  const archivo = pendiente;
  mostrarCarga(vista, `Subiendo ${archivo.name} y comprimiéndolo…`);
  try {
    const original = await archivo.arrayBuffer();
    const { resultado, bytesSuf, local } = await comprimir(archivo, original);
    subido = {
      nombre: archivo.name,
      resultado,
      bytesSuf,
      local,
      integridad: comprobarIntegridad(original, bytesSuf),
    };
    pendiente = null;
    if (!sigueAbierto()) return;
    alCargar(subido);
    await terminarCarga(vista);
  } catch (error) {
    if (error.estado === undefined) console.error(error);
    if (sigueAbierto()) {
      mostrarError(error.estado ?? -1, () => cargarArchivo(vista, alCargar), vista, "archivo");
    }
  }
}
