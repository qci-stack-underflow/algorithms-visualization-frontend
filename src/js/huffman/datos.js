// Pide los datos de un libro mostrando la carga y los errores en su vista
// (carga.js): el resultado de Huffman para el proceso, y además el .suf para
// el binario.
import { descargarSuf, huffmanListo, obtenerHuffman, obtenerLibros, sufListo } from "../api.js";
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

// El binario necesita también los bytes del .suf.
const pedir = (numero, vista) =>
  vista === "binario"
    ? Promise.all([obtenerHuffman(numero), descargarSuf(numero)])
    : Promise.all([obtenerHuffman(numero)]);

const yaGuardado = (numero, vista) =>
  huffmanListo(numero) && (vista !== "binario" || sufListo(numero));

// Devuelve el HuffmanResult, o null si falló, el usuario cambió de libro o
// no hay backend de Huffman. `alCargar(resultado, bytesSuf)` llena la vista
// antes de mostrarla (bytesSuf solo en el binario); "Reintentar" vuelve a
// llamarla. `vista` es "proceso" o "binario".
export async function cargarLibro(numero, alCargar = () => {}, vista = "proceso") {
  if (sinRutasDeHuffman) return null;

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
    if (error.estado === 404 && (await faltanRutasDeHuffman())) {
      sinRutasDeHuffman = true;
      if (sigueAbierto(numero)) reiniciarCarga();
      return null;
    }
    // Un error que no es de la API (sin estado) es un fallo del frontend:
    // se registra y se muestra el mensaje de error inesperado.
    if (error.estado === undefined) console.error(error);
    if (sigueAbierto(numero)) {
      mostrarError(error.estado ?? -1, () => cargarLibro(numero, alCargar, vista), vista);
    }
    return null;
  }
}
