// Pide los datos de un libro mostrando la carga y los errores en su vista
// (carga.js): el resultado de Huffman para el proceso, y además el .suf para
// el binario.
import { descargarSuf, huffmanListo, obtenerHuffman, obtenerLibros, sufListo } from "../api.js";
import { mostrarCarga, mostrarError, reiniciarCarga, terminarCarga } from "./carga.js";
import { leerRuta } from "./rutas.js";

// Si el backend todavía no tiene las rutas de /huffman, la pantalla usa el
// resultado de ejemplo del Quijote: el JSON de A1 (docs/ejemplos/
// huffman-quijote.json del backend). Se importa aparte para que solo se
// descargue en ese caso; si tampoco llega, se queda lo escrito en
// huffman.html. Cuando el backend tenga las rutas, se usan sus datos sin
// cambiar nada aquí.
let sinRutasDeHuffman = false;
const cargarEjemplo = () => import("./ejemplo-quijote.json").then((modulo) => modulo.default);

export const enModoEjemplo = () => sinRutasDeHuffman;

// Título y autor del texto. El contrato los pone en `source` (libro de
// Gutenberg o archivo subido) y conserva `book` por compatibilidad, así que
// se lee `source` primero. Un dato que no viene queda en null.
export function origenDe(resultado) {
  return {
    titulo: resultado?.source?.title || resultado?.book?.title || null,
    autor: resultado?.source?.author || resultado?.book?.author || null,
  };
}

// Un 404 del libro puede ser un libro que no existe o un backend sin las
// rutas de Huffman; en el segundo caso el catálogo también da 404. Un 501
// es una ruta que el backend ya declara pero todavía no implementa.
async function faltanRutasDeHuffman(error) {
  if (error.estado === 501) return true;
  if (error.estado !== 404) return false;
  try {
    await obtenerLibros();
    return false;
  } catch (errorDelCatalogo) {
    return errorDelCatalogo.estado === 404;
  }
}

// Si el usuario ya cambió de libro, la respuesta tardía no debe tocar la vista.
const sigueAbierto = (numero) => leerRuta(location.hash)?.libro === numero;

// El binario necesita también los bytes del .suf.
const pedir = (numero, vista) =>
  vista === "binario"
    ? Promise.all([obtenerHuffman(numero), descargarSuf(numero)])
    : Promise.all([obtenerHuffman(numero)]);

const yaGuardado = (numero, vista) =>
  huffmanListo(numero) && (vista !== "binario" || sufListo(numero));

// Llena la vista con el ejemplo. Si se estaba mostrando la carga en
// `vistaEnCarga`, la termina igual que con datos reales.
async function usarEjemplo(numero, alUsarEjemplo, vistaEnCarga = null) {
  let ejemplo;
  try {
    ejemplo = await cargarEjemplo();
  } catch {
    if (vistaEnCarga && sigueAbierto(numero)) reiniciarCarga();
    return;
  }
  if (!sigueAbierto(numero)) return;
  alUsarEjemplo(ejemplo);
  if (vistaEnCarga) await terminarCarga(vistaEnCarga);
}

// Devuelve el HuffmanResult, o null si falló, el usuario cambió de libro o
// no hay backend de Huffman. Opciones:
// - vista: "proceso" o "binario" (el binario pide además el .suf)
// - alCargar(resultado, bytesSuf): llena la vista con datos del backend antes
//   de mostrarla (bytesSuf solo en el binario); "Reintentar" vuelve a llamarla
// - alUsarEjemplo(resultado): llena la vista con el ejemplo si no hay backend
export async function cargarLibro(numero, opciones = {}) {
  const { vista = "proceso", alCargar = () => {}, alUsarEjemplo = () => {} } = opciones;
  if (sinRutasDeHuffman) {
    await usarEjemplo(numero, alUsarEjemplo);
    return null;
  }

  // Ya guardado (p. ej. al volver del binario): sin carga ni petición nueva.
  if (yaGuardado(numero, vista)) {
    const datos = await pedir(numero, vista);
    if (sigueAbierto(numero)) alCargar(...datos);
    return datos[0];
  }

  mostrarCarga(vista);
  try {
    const datos = await pedir(numero, vista);
    if (!sigueAbierto(numero)) return null;
    alCargar(...datos);
    await terminarCarga(vista);
    return datos[0];
  } catch (error) {
    if (await faltanRutasDeHuffman(error)) {
      sinRutasDeHuffman = true;
      if (sigueAbierto(numero)) await usarEjemplo(numero, alUsarEjemplo, vista);
      return null;
    }
    // Un error que no es de la API (sin estado) es un fallo del frontend:
    // se registra y se muestra el mensaje de error inesperado.
    if (error.estado === undefined) console.error(error);
    if (sigueAbierto(numero)) {
      mostrarError(error.estado ?? -1, () => cargarLibro(numero, opciones), vista);
    }
    return null;
  }
}
