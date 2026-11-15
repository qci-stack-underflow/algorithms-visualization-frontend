// Compresor de Huffman en el navegador, solo para el modo ejemplo de la
// subida: mientras el backend no tenga POST /huffman/compress/file, un .txt
// subido se comprime aquí. Es una copia fiel del compresor del backend
// (bloque A, rama arcamp0130/feature/huffman-compressor): mismas hojas en
// orden de primera aparición, mismo min-heap con desempate por peso y luego
// por id, mismos pasos, mismas métricas y el mismo .suf (SUF1) byte a byte.
// Cuando el backend tenga la ruta, se usa la suya y esto deja de llamarse.

const encoder = new TextEncoder();

// Se lanza con `estado` como los errores de la API, para que carga.js
// muestre el mensaje que corresponde (400: el archivo no es válido).
function errorDeArchivo(mensaje) {
  const error = new Error(mensaje);
  error.estado = 400;
  return error;
}

// Apariciones por punto de código Unicode, en orden de primera aparición.
function contarFrecuencias(texto) {
  const simbolos = [];
  const frecuencias = new Map();
  let total = 0;
  for (const caracter of texto) {
    total += 1;
    const cuenta = frecuencias.get(caracter);
    if (cuenta === undefined) {
      simbolos.push(caracter);
      frecuencias.set(caracter, 1);
    } else {
      frecuencias.set(caracter, cuenta + 1);
    }
  }
  return { simbolos, frecuencias, total };
}

// Min-heap binario con el desempate del contrato: menor peso y, si empatan,
// menor id. Cuenta las comparaciones igual que el backend.
class ColaDePrioridad {
  #elementos = [];
  comparaciones = 0;

  get length() {
    return this.#elementos.length;
  }

  #menor(a, b) {
    this.comparaciones += 1;
    return a.weight !== b.weight ? a.weight - b.weight : a.id - b.id;
  }

  #intercambiar(i, j) {
    const elementos = this.#elementos;
    [elementos[i], elementos[j]] = [elementos[j], elementos[i]];
  }

  push(nodo) {
    const elementos = this.#elementos;
    elementos.push(nodo);
    let actual = elementos.length - 1;
    while (actual > 0) {
      const padre = Math.floor((actual - 1) / 2);
      if (this.#menor(elementos[actual], elementos[padre]) >= 0) break;
      this.#intercambiar(actual, padre);
      actual = padre;
    }
  }

  pop() {
    const elementos = this.#elementos;
    const primero = elementos[0];
    const ultimo = elementos.pop();
    if (elementos.length > 0) {
      elementos[0] = ultimo;
      let actual = 0;
      for (;;) {
        let menor = actual;
        const izquierdo = 2 * actual + 1;
        const derecho = 2 * actual + 2;
        if (izquierdo < elementos.length && this.#menor(elementos[izquierdo], elementos[menor]) < 0) {
          menor = izquierdo;
        }
        if (derecho < elementos.length && this.#menor(elementos[derecho], elementos[menor]) < 0) {
          menor = derecho;
        }
        if (menor === actual) break;
        this.#intercambiar(actual, menor);
        actual = menor;
      }
    }
    return primero;
  }
}

const describir = (nodo) => (nodo.isLeaf ? JSON.stringify(nodo.symbol) : "interno");

// Árbol, códigos y pasos (3k − 2) con las líneas del pseudocódigo del contrato.
function construirArbol(simbolos, frecuencias) {
  const nodes = simbolos.map((symbol, id) => ({
    id,
    weight: frecuencias.get(symbol),
    symbol,
    left: null,
    right: null,
    parentId: null,
    isLeaf: true,
  }));
  const steps = [];
  const cola = new ColaDePrioridad();
  nodes.forEach((hoja) => cola.push(hoja));

  while (cola.length > 1) {
    const x = cola.pop();
    steps.push({ type: "extract-min", nodeId: x.id, line: 3, description: `Extrae nodo ${x.id} (${describir(x)}, peso ${x.weight})` });
    const y = cola.pop();
    steps.push({ type: "extract-min", nodeId: y.id, line: 4, description: `Extrae nodo ${y.id} (${describir(y)}, peso ${y.weight})` });

    const z = { id: nodes.length, weight: x.weight + y.weight, symbol: null, left: x.id, right: y.id, parentId: null, isLeaf: false };
    x.parentId = z.id;
    y.parentId = z.id;
    nodes.push(z);
    cola.push(z);
    steps.push({
      type: "merge",
      leftId: x.id,
      rightId: y.id,
      parentId: z.id,
      weight: z.weight,
      line: 5,
      description: `Une nodo ${x.id} (peso ${x.weight}) + nodo ${y.id} (peso ${y.weight}) en nodo ${z.id} con peso ${z.weight}`,
    });
  }

  const raiz = cola.pop();
  const codes = {};
  if (raiz.isLeaf) {
    // Un solo símbolo distinto: su código es "0".
    raiz.code = "0";
    codes[raiz.symbol] = "0";
  } else {
    // Sin recursión: un texto con muchos símbolos raros puede tener un árbol profundo.
    const pendientes = [[raiz.id, ""]];
    while (pendientes.length > 0) {
      const [id, prefijo] = pendientes.pop();
      const nodo = nodes[id];
      nodo.code = prefijo;
      if (nodo.isLeaf) codes[nodo.symbol] = prefijo;
      else pendientes.push([nodo.right, `${prefijo}1`], [nodo.left, `${prefijo}0`]);
    }
  }
  steps.push({
    type: "assign-code",
    nodeId: raiz.id,
    code: raiz.code,
    line: 8,
    description: "Códigos prefijo asignados recorriendo el árbol (0 izquierda, 1 derecha)",
  });

  return { nodes, rootId: raiz.id, steps, codes, comparaciones: cola.comparaciones, merges: simbolos.length - 1 };
}

// Archivo .suf (SUF1), todo big-endian: firma, caracteres (uint32), relleno
// (uint8), k (uint16), título (uint16 + UTF-8), diccionario
// (uint8 + símbolo UTF-8, uint32 frecuencia, uint8 + código ASCII) y datos
// con el bit más significativo primero.
function escribirSuf(texto, titulo, simbolos, frecuencias, codes, total, totalBits) {
  if (simbolos.length > 0xffff) throw errorDeArchivo("El texto tiene más de 65,535 símbolos distintos.");
  const tituloBytes = encoder.encode(titulo);
  const entradas = simbolos.map((simbolo) => ({
    simbolo: encoder.encode(simbolo),
    frecuencia: frecuencias.get(simbolo),
    codigo: encoder.encode(codes[simbolo]),
  }));
  const relleno = (8 - (totalBits % 8)) % 8;
  const bytesDeDatos = (totalBits + relleno) / 8;
  const encabezado =
    4 + 4 + 1 + 2 + 2 + tituloBytes.length +
    entradas.reduce((suma, e) => suma + 1 + e.simbolo.length + 4 + 1 + e.codigo.length, 0);

  const suf = new Uint8Array(encabezado + bytesDeDatos);
  const vista = new DataView(suf.buffer);
  let posicion = 0;
  suf.set(encoder.encode("SUF1"), posicion);
  posicion += 4;
  vista.setUint32(posicion, total);
  posicion += 4;
  vista.setUint8(posicion, relleno);
  posicion += 1;
  vista.setUint16(posicion, entradas.length);
  posicion += 2;
  vista.setUint16(posicion, tituloBytes.length);
  posicion += 2;
  suf.set(tituloBytes, posicion);
  posicion += tituloBytes.length;
  for (const { simbolo, frecuencia, codigo } of entradas) {
    vista.setUint8(posicion, simbolo.length);
    suf.set(simbolo, posicion + 1);
    posicion += 1 + simbolo.length;
    vista.setUint32(posicion, frecuencia);
    vista.setUint8(posicion + 4, codigo.length);
    suf.set(codigo, posicion + 5);
    posicion += 5 + codigo.length;
  }

  // Los bits se escriben directamente en los bytes, sin armar un texto "0101".
  let bit = posicion * 8;
  for (const caracter of texto) {
    const codigo = codes[caracter];
    for (let i = 0; i < codigo.length; i += 1) {
      if (codigo.charCodeAt(i) === 49) suf[bit >> 3] |= 0x80 >> (bit & 7);
      bit += 1;
    }
  }
  return suf;
}

// Mismas fórmulas y redondeos que calculateMetrics del backend.
function calcularMetricas({ texto, total, simbolos, frecuencias, codes, tamanoSuf, comparaciones, merges, pasos, milisegundos }) {
  const originalBytes = encoder.encode(texto).length;
  let totalBits = 0;
  let entropia = 0;
  for (const simbolo of simbolos) {
    const frecuencia = frecuencias.get(simbolo);
    const p = frecuencia / total;
    if (p > 0) entropia -= p * Math.log2(p);
    totalBits += frecuencia * codes[simbolo].length;
  }
  const paddingBits = (8 - (totalBits % 8)) % 8;
  const compressedBytes = Math.ceil((totalBits + paddingBits) / 8);
  return {
    originalBytes,
    compressedBytes,
    fileSizeBytes: tamanoSuf,
    headerBytes: tamanoSuf - compressedBytes,
    savingsPercentage: Number((((originalBytes - tamanoSuf) / originalBytes) * 100).toFixed(2)),
    totalBits,
    paddingBits,
    bitsPerSymbol: Number((totalBits / total).toFixed(2)),
    entropy: Number(entropia.toFixed(2)),
    fixedBits: total * Math.ceil(Math.log2(Math.max(simbolos.length, 2))),
    comparisons: comparaciones,
    merges,
    steps: pasos,
    executionTimeMs: milisegundos,
  };
}

// Lee el archivo como UTF-8 sin quitar el BOM, igual que el backend con
// Buffer#toString: el .suf guarda exactamente el texto del archivo.
export function leerTexto(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw errorDeArchivo("El archivo no está en UTF-8.");
  }
}

// Comprime un texto como POST /huffman/compress/file: devuelve el
// HuffmanResult y los bytes del .suf. `archivo` = { nombre, bytes }.
export function comprimirEnNavegador(texto, { titulo, archivo }) {
  if (texto.length === 0) throw errorDeArchivo("El archivo está vacío.");

  const inicio = performance.now();
  const { simbolos, frecuencias, total } = contarFrecuencias(texto);
  const arbol = construirArbol(simbolos, frecuencias);
  const milisegundos = Number((performance.now() - inicio).toFixed(2));

  let totalBits = 0;
  for (const simbolo of simbolos) totalBits += frecuencias.get(simbolo) * arbol.codes[simbolo].length;
  const suf = escribirSuf(texto, titulo, simbolos, frecuencias, arbol.codes, total, totalBits);
  const metrics = calcularMetricas({
    texto,
    total,
    simbolos,
    frecuencias,
    codes: arbol.codes,
    tamanoSuf: suf.length,
    comparaciones: arbol.comparaciones,
    merges: arbol.merges,
    pasos: arbol.steps.length,
    milisegundos,
  });

  const table = simbolos.map((symbol, nodeId) => {
    const frequency = frecuencias.get(symbol);
    const code = arbol.codes[symbol];
    return { symbol, frequency, percentage: Number(((frequency / total) * 100).toFixed(2)), code, bits: code.length, nodeId };
  });
  const frase = texto.slice(0, 30);
  const tokens = [...frase].map((char) => ({ char, code: arbol.codes[char] ?? "" }));

  const resultado = {
    source: {
      type: "upload",
      filename: archivo.nombre,
      title: titulo,
      size: `${(metrics.originalBytes / 1024).toFixed(0)} KB`,
      bytes: archivo.bytes,
      mimeType: "text/plain",
    },
    totalCharacters: total,
    distinctSymbols: simbolos.length,
    rootId: arbol.rootId,
    nodes: arbol.nodes,
    steps: arbol.steps,
    table,
    codes: arbol.codes,
    metrics,
    preview: { text: frase, tokens, encodedBits: tokens.map((token) => token.code).join("") },
  };
  return { resultado, bytesSuf: suf.buffer };
}
