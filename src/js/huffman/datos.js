// Pide el resultado de Huffman de un libro mostrando la carga y los errores
// de la vista de proceso (carga.js).
import { huffmanListo, obtenerHuffman, obtenerLibros } from "../api.js";
import { mostrarCarga, mostrarError, reiniciarCarga, terminarCarga } from "./carga.js";
import { leerRuta } from "./rutas.js";

// Si el backend todavía no tiene las rutas de /huffman, la pantalla se queda
// con los datos de ejemplo del Quijote escritos en huffman.html. Cuando las
// tenga, se usan sus datos sin cambiar nada aquí.
let sinRutasDeHuffman = false;

export const enModoEjemplo = () => sinRutasDeHuffman;

// Un 404 del libro puede ser un libro que no existe o un backend sin las
// rutas de Huffman; en el segundo caso el catálogo también da 404.
async function faltanRutasDeHuffman() {
  try {
    await obtenerLibros();
    return false;
  } catch (error) {
    return error.estado === 404;
  }
}

// Si el usuario ya cambió de libro, la respuesta tardía no debe tocar la vista.
const sigueAbierto = (numero) => leerRuta(location.hash)?.libro === numero;

// Devuelve el HuffmanResult, o null si falló, el usuario cambió de libro o
// no hay backend de Huffman. `alCargar(resultado)` llena la vista antes de
// mostrarla; "Reintentar" vuelve a llamarla.
export async function cargarLibro(numero, alCargar = () => {}) {
  if (sinRutasDeHuffman) return null;

  // Ya guardado (p. ej. al volver del binario): sin carga ni petición nueva.
  if (huffmanListo(numero)) {
    const resultado = await obtenerHuffman(numero);
    if (sigueAbierto(numero)) alCargar(resultado);
    return resultado;
  }

  mostrarCarga();
  try {
    const resultado = await obtenerHuffman(numero);
    if (!sigueAbierto(numero)) return null;
    alCargar(resultado);
    await terminarCarga();
    return resultado;
  } catch (error) {
    if (error.estado === 404 && (await faltanRutasDeHuffman())) {
      sinRutasDeHuffman = true;
      if (sigueAbierto(numero)) reiniciarCarga();
      return null;
    }
    if (sigueAbierto(numero)) {
      mostrarError(error.estado ?? 0, () => cargarLibro(numero, alCargar));
    }
    return null;
  }
}
