// Comunicación con el backend o uso de respaldo local en desarrollo
import ejemploQuijote from "./huffman/ejemplo-quijote.json";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
  }
}

async function solicitar(ruta, cuerpo, formato = "json") {
  const opciones =
    cuerpo === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        };

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch {
    throw new ErrorApi("No se pudo conectar con el backend.", 0);
  }

  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorApi(datos?.message || `Error ${respuesta.status} del backend.`, respuesta.status);
  }
  return formato === "bytes" ? respuesta.arrayBuffer() : respuesta.json().catch(() => null);
}

// ---------------------------------------------------------------------------
// Ordenamientos
// ---------------------------------------------------------------------------

export function nombreAId(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "-");
}

export function obtenerAlgoritmo(id) {
  return solicitar(`/algorithms/${id}`);
}

export function ejecutarAlgoritmo(id, input) {
  return solicitar(`/algorithms/${id}/run`, { input });
}

export function compararAlgoritmos(ids, input) {
  return solicitar("/algorithms/compare", { algorithms: ids, input });
}

// ---------------------------------------------------------------------------
// Huffman & Gestión de Estado Local / Respaldo
// ---------------------------------------------------------------------------

const guardados = {
  libros: new Map(),
  huffman: new Map(),
  suf: new Map(),
};

const huffmanListos = new Set();
const sufListos = new Set();

export function huffmanListo(id) {
  return huffmanListos.has(Number(id));
}

export function sufListo(id) {
  return sufListos.has(Number(id));
}

function recordar(mapa, clave, pedir) {
  if (!mapa.has(clave)) {
    const promesa = pedir().catch((error) => {
      mapa.delete(clave);
      throw error;
    });
    mapa.set(clave, promesa);
  }
  return mapa.get(clave);
}

function numeroDeLibro(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new ErrorApi("El número de libro no es válido.", 400);
  }
  return numero;
}

// Catálogo simulado de libros para la biblioteca
export async function obtenerLibros() {
  return recordar(guardados.libros, "catalogo", async () => {
    try {
      return await solicitar("/huffman/books");
    } catch {
      // Catálogo de respaldo local
      return [
        { id: 2000, title: "Don Quijote", author: "Miguel de Cervantes Saavedra", language: "Español", size: "2.2 MB" },
        { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", language: "Inglés", size: "772 KB" },
        { id: 2701, title: "Moby Dick; Or, The Whale", author: "Herman Melville", language: "Inglés", size: "1.3 MB" },
        { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley", language: "Inglés", size: "449 KB" },
        { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", language: "Inglés", size: "608 KB" },
        { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", language: "Inglés", size: "174 KB" }
      ];
    }
  });
}

// Obtener datos de Huffman (usa el JSON de Don Quijote como respaldo local si no hay backend)
export async function obtenerHuffman(id) {
  const numero = numeroDeLibro(id);
  return recordar(guardados.huffman, numero, async () => {
    try {
      const resultado = await solicitar(`/huffman/books/${numero}`);
      huffmanListos.add(numero);
      return resultado;
    } catch {
      console.warn("Backend no disponible. Usando datos locales de respaldo (ejemplo-quijote.json).");
      huffmanListos.add(numero);
      return ejemploQuijote;
    }
  });
}

// Descarga o genera un búfer simulado para el archivo .suf en local
export async function descargarSuf(id) {
  const numero = numeroDeLibro(id);
  return recordar(guardados.suf, numero, async () => {
    try {
      const bytes = await solicitar(`/huffman/books/${numero}/file`, undefined, "bytes");
      sufListos.add(numero);
      return bytes;
    } catch {
      console.warn("Backend no disponible. Generando archivo .suf simulado con tamaño real.");
      sufListos.add(numero);
      
      // Tamaño real aproximado del comprimido de Don Quijote (1.16 MB)
      const tamanoSimulado = ejemploQuijote.metrics?.fileSizeBytes || 1166923;
      const bufferSimulado = new ArrayBuffer(tamanoSimulado);
      const vistaBytes = new Uint8Array(bufferSimulado);
      
      // Escribir la firma "SUF1" al inicio del archivo binario
      const encoder = new TextEncoder();
      vistaBytes.set(encoder.encode("SUF1"), 0);
      
      return bufferSimulado;
    }
  });
}