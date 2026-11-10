// Comunicación con el backend (algorithms-visualization-backend).
// En desarrollo se usa el proxy de Vite (/api → localhost:3000); en
// producción se define VITE_API_URL con la URL pública del backend.
const API_URL = import.meta.env.VITE_API_URL || "/api";

// Error de la API con el estado HTTP, para que la interfaz elija qué mensaje
// mostrar (ver huffman/carga.js). `estado` es 0 si no hubo respuesta.
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
  }
}

// Sin `cuerpo` hace un GET; con `cuerpo`, un POST con JSON.
// Con formato "bytes" devuelve un ArrayBuffer en lugar de JSON.
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
    // Nest responde los errores como JSON con `message`, también en /file.
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorApi(datos?.message || `Error ${respuesta.status} del backend.`, respuesta.status);
  }
  return formato === "bytes" ? respuesta.arrayBuffer() : respuesta.json().catch(() => null);
}

// ---------------------------------------------------------------------------
// Ordenamientos
// ---------------------------------------------------------------------------

// "Bubble Sort" → "bubble-sort" (id que usa el backend)
export function nombreAId(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "-");
}

// GET /algorithms/:id → AlgorithmInfo (nombre, complejidad, pseudocódigo)
export function obtenerAlgoritmo(id) {
  return solicitar(`/algorithms/${id}`);
}

// POST /algorithms/:id/run → AlgorithmResult
export function ejecutarAlgoritmo(id, input) {
  return solicitar(`/algorithms/${id}/run`, { input });
}

// POST /algorithms/compare → AlgorithmResult[] (mínimo dos algoritmos)
export function compararAlgoritmos(ids, input) {
  return solicitar("/algorithms/compare", { algorithms: ids, input });
}

// ---------------------------------------------------------------------------
// Huffman (contrato: src/types/huffman.types.ts del backend)
// ---------------------------------------------------------------------------

// Cada respuesta se guarda: ir del proceso al binario y volver, o abrir dos
// veces el mismo libro, no la vuelve a pedir. Si una petición falla se
// olvida, para que "Reintentar" pueda pedirla de nuevo.
const guardados = {
  libros: new Map(), // una sola entrada: el catálogo
  huffman: new Map(), // número de libro → Promise<HuffmanResult>
  suf: new Map(), // número de libro → Promise<ArrayBuffer>
};
const huffmanListos = new Set(); // libros cuyo resultado ya llegó
const sufListos = new Set(); // libros cuyo .suf ya llegó

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

// El backend solo acepta el número del libro (nunca una URL); se valida
// aquí también para no hacer una petición que de todos modos daría 400.
function numeroDeLibro(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new ErrorApi("El número de libro no es válido.", 400);
  }
  return numero;
}

// GET /huffman/books → BookInfo[] (catálogo)
export async function obtenerLibros() {
  return recordar(guardados.libros, "catalogo", () => solicitar("/huffman/books"));
}

// GET /huffman/books/:id → HuffmanResult (frecuencias, árbol, pasos, códigos y métricas)
export async function obtenerHuffman(id) {
  const numero = numeroDeLibro(id);
  return recordar(guardados.huffman, numero, async () => {
    const resultado = await solicitar(`/huffman/books/${numero}`);
    huffmanListos.add(numero);
    return resultado;
  });
}

// true si el resultado de ese libro ya llegó (se puede usar sin esperar).
export function huffmanListo(id) {
  return huffmanListos.has(Number(id));
}

// Separa la respuesta binaria de POST /huffman/compress/file (opción B de
// backend#53): uint32 big-endian con el largo n del JSON, n bytes del
// HuffmanResult en UTF-8 y después el archivo .suf completo.
export function separarRespuestaDeArchivo(buffer) {
  const incompleta = () => new ErrorApi("La respuesta del backend está incompleta.", -1);
  if (buffer.byteLength < 4) throw incompleta();
  const largo = new DataView(buffer).getUint32(0);
  if (4 + largo > buffer.byteLength) throw incompleta();
  let resultado;
  try {
    resultado = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, largo)));
  } catch {
    throw new ErrorApi("La respuesta del backend no trae un resultado válido.", -1);
  }
  return { resultado, bytesSuf: buffer.slice(4 + largo) };
}

// POST /huffman/compress/file (multipart, campo "file") → { resultado, bytesSuf }
export async function comprimirArchivo(archivo) {
  const formulario = new FormData();
  formulario.append("file", archivo);
  formulario.append("title", archivo.name.replace(/\.txt$/i, ""));

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/huffman/compress/file`, { method: "POST", body: formulario });
  } catch {
    throw new ErrorApi("No se pudo conectar con el backend.", 0);
  }
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorApi(datos?.message || `Error ${respuesta.status} del backend.`, respuesta.status);
  }
  return separarRespuestaDeArchivo(await respuesta.arrayBuffer());
}

// GET /huffman/books/:id/file → ArrayBuffer con el archivo .suf
export async function descargarSuf(id) {
  const numero = numeroDeLibro(id);
  return recordar(guardados.suf, numero, async () => {
    const bytes = await solicitar(`/huffman/books/${numero}/file`, undefined, "bytes");
    sufListos.add(numero);
    return bytes;
  });
}

// true si el .suf de ese libro ya llegó.
export function sufListo(id) {
  return sufListos.has(Number(id));
}
