// Lee el encabezado de un archivo .suf (formato SUF1, SufHeader en el
// contrato de A1). Todos los números son big-endian:
//   "SUF1" (4 bytes ASCII)
//   total de caracteres (uint32)
//   bits de relleno del último byte (uint8, 0..7)
//   símbolos distintos k (uint16)
//   largo del título (uint16) + título en UTF-8
//   diccionario, k veces: largo del símbolo (uint8) + símbolo en UTF-8 +
//     frecuencia (uint32) + largo del código (uint8) + código en ASCII ("010")
//   datos: los bits comprimidos, el primero en el bit más significativo

export const FIRMA_SUF = "SUF1";

export class ErrorSuf extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorSuf";
  }
}

// Devuelve { encabezado, bytesEncabezado, datos, bitsDatos, secciones }:
// - encabezado: { magic, totalCharacters, paddingBits, symbolCount, title, dictionary },
//   con dictionary = [{ symbol, frequency, codeLength, code }] (SufDictionaryEntry)
// - datos: Uint8Array con solo los bits comprimidos
// - bitsDatos: bits útiles de los datos (sin el relleno)
// - secciones: [{ clave, inicio, bytes }] con dónde empieza cada parte del
//   archivo y cuánto mide (para el inspector)
export function leerSuf(buffer) {
  const bytes = new Uint8Array(buffer);
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  let posicion = 0;

  const tomar = (cuantos) => {
    if (posicion + cuantos > bytes.length) {
      throw new ErrorSuf("El archivo .suf está incompleto: se acaba antes de terminar el encabezado.");
    }
    const inicio = posicion;
    posicion += cuantos;
    return inicio;
  };
  const uint8 = () => vista.getUint8(tomar(1));
  const uint16 = () => vista.getUint16(tomar(2));
  const uint32 = () => vista.getUint32(tomar(4));
  const texto = (cuantos) => {
    const inicio = tomar(cuantos);
    try {
      return utf8.decode(bytes.subarray(inicio, inicio + cuantos));
    } catch {
      throw new ErrorSuf("El encabezado del .suf tiene texto que no es UTF-8.");
    }
  };

  const secciones = [];
  const marcar = (clave, inicio) => secciones.push({ clave, inicio, bytes: posicion - inicio });

  const inicioFirma = tomar(4);
  const magic = String.fromCharCode(...bytes.subarray(inicioFirma, inicioFirma + 4));
  if (magic !== FIRMA_SUF) {
    throw new ErrorSuf(`No es un archivo .suf: empieza con «${magic}» en lugar de «${FIRMA_SUF}».`);
  }
  marcar("firma", 0);
  const totalCharacters = uint32();
  marcar("caracteres", 4);
  const paddingBits = uint8();
  if (paddingBits > 7) throw new ErrorSuf(`Los bits de relleno deben ser de 0 a 7, no ${paddingBits}.`);
  marcar("relleno", 8);
  const symbolCount = uint16();
  marcar("simbolos", 9);
  const title = texto(uint16());
  marcar("titulo", 11);
  const inicioDiccionario = posicion;
  const dictionary = Array.from({ length: symbolCount }, () => {
    const symbol = texto(uint8());
    const frequency = uint32();
    const codeLength = uint8();
    const inicioCodigo = tomar(codeLength);
    const code = String.fromCharCode(...bytes.subarray(inicioCodigo, inicioCodigo + codeLength));
    if (!/^[01]+$/.test(code)) {
      throw new ErrorSuf(`El código del símbolo «${symbol}» debe ser de ceros y unos, no «${code}».`);
    }
    return { symbol, frequency, codeLength, code };
  });

  marcar("diccionario", inicioDiccionario);

  const datos = bytes.subarray(posicion);
  secciones.push({ clave: "datos", inicio: posicion, bytes: datos.length });
  return {
    encabezado: { magic, totalCharacters, paddingBits, symbolCount, title, dictionary },
    bytesEncabezado: posicion,
    datos,
    bitsDatos: Math.max(0, datos.length * 8 - paddingBits),
    secciones,
  };
}

// Tamaño en bytes del texto original sin tenerlo: cada símbolo ocupa sus
// bytes en UTF-8 tantas veces como aparece.
export function bytesOriginales(dictionary) {
  const utf8 = new TextEncoder();
  return dictionary.reduce((total, { symbol, frequency }) => total + utf8.encode(symbol).length * frequency, 0);
}

// Reconstruye el árbol de Huffman con los códigos del diccionario: cada 0
// baja a la izquierda y cada 1 a la derecha. Devuelve { nodes, rootId,
// niveles } con la forma de HuffmanNode del contrato (hojas 0..k-1 en el
// orden del diccionario; los nodos internos después, cada uno tras sus
// hijos). Lanza ErrorSuf si un código es prefijo de otro o si falta una
// rama, porque entonces el archivo no se podría decodificar.
export function reconstruirArbol(dictionary) {
  const raiz = { hijos: [null, null], hoja: null };
  dictionary.forEach(({ symbol, code }, indice) => {
    let actual = raiz;
    for (const bit of code) {
      if (actual.hoja !== null) {
        throw new ErrorSuf(`El código de «${symbol}» empieza con el de «${dictionary[actual.hoja].symbol}».`);
      }
      const lado = bit === "1" ? 1 : 0;
      actual.hijos[lado] ??= { hijos: [null, null], hoja: null };
      actual = actual.hijos[lado];
    }
    if (actual.hoja !== null || actual.hijos[0] || actual.hijos[1]) {
      throw new ErrorSuf(`El código de «${symbol}» es prefijo de otro código o está repetido.`);
    }
    actual.hoja = indice;
  });

  const nodes = dictionary.map(({ symbol, frequency, code }, id) => ({
    id, weight: frequency, symbol, left: null, right: null, parentId: null, code, isLeaf: true,
  }));
  // Con un solo símbolo (código "0") la raíz tiene solo la rama izquierda.
  const unSoloSimbolo = dictionary.length === 1;
  let niveles = 0;
  const visitar = (nodo, codigo) => {
    if (nodo.hoja !== null) {
      niveles = Math.max(niveles, codigo.length);
      return nodo.hoja;
    }
    const [izquierdo, derecho] = nodo.hijos;
    if (!izquierdo || (!derecho && !unSoloSimbolo)) {
      throw new ErrorSuf(`Al árbol le falta una rama después de «${codigo || "la raíz"}».`);
    }
    const left = visitar(izquierdo, `${codigo}0`);
    const right = derecho ? visitar(derecho, `${codigo}1`) : null;
    const id = nodes.length;
    nodes.push({
      id,
      weight: nodes[left].weight + (right === null ? 0 : nodes[right].weight),
      symbol: null, left, right, parentId: null, code: codigo, isLeaf: false,
    });
    nodes[left].parentId = id;
    if (right !== null) nodes[right].parentId = id;
    return id;
  };
  if (dictionary.length === 0) return { nodes, rootId: null, niveles };
  const rootId = visitar(raiz, "");
  return { nodes, rootId, niveles };
}

// Recupera el texto: cada bit baja por el árbol (0 a la izquierda, 1 a la
// derecha) y al llegar a una hoja se escribe su símbolo y se vuelve a la
// raíz. Lanza ErrorSuf si un bit no lleva a ningún nodo o si los datos
// terminan a la mitad de un código.
export function descomprimir(suf, arbol) {
  const { datos, bitsDatos } = suf;
  const { nodes, rootId } = arbol;
  if (rootId === null) return "";
  // Arreglos planos para que el recorrido de millones de bits sea rápido.
  const izquierda = Int32Array.from(nodes, (nodo) => (nodo.left === null ? -1 : nodo.left));
  const derecha = Int32Array.from(nodes, (nodo) => (nodo.right === null ? -1 : nodo.right));
  const simbolos = nodes.map((nodo) => (nodo.isLeaf ? nodo.symbol : null));

  const partes = [];
  let actual = rootId;
  for (let bit = 0; bit < bitsDatos; bit += 1) {
    const uno = (datos[bit >> 3] >> (7 - (bit & 7))) & 1;
    actual = uno ? derecha[actual] : izquierda[actual];
    if (actual < 0) throw new ErrorSuf(`El bit ${bit} de los datos no lleva a ningún símbolo.`);
    if (simbolos[actual] !== null) {
      partes.push(simbolos[actual]);
      actual = rootId;
    }
  }
  if (actual !== rootId) throw new ErrorSuf("Los datos terminan a la mitad de un código.");
  return partes.join("");
}

// Comprobaciones de integridad que no necesitan el original: el texto
// recuperado debe tener los caracteres, las apariciones de cada símbolo y
// el tamaño que dice el encabezado. Devuelve [{ clave, ok, detalle }].
export function comprobarTexto(texto, suf) {
  const { encabezado } = suf;
  const cuenta = new Map();
  let caracteres = 0;
  for (const simbolo of texto) {
    cuenta.set(simbolo, (cuenta.get(simbolo) ?? 0) + 1);
    caracteres += 1;
  }
  const distintas = encabezado.dictionary.filter(({ symbol, frequency }) => cuenta.get(symbol) !== frequency);
  const sobrantes = [...cuenta.keys()].filter((simbolo) => !encabezado.dictionary.some((e) => e.symbol === simbolo));
  const bytes = new TextEncoder().encode(texto).length;
  const esperados = bytesOriginales(encabezado.dictionary);
  return [
    { clave: "caracteres", ok: caracteres === encabezado.totalCharacters, obtenido: caracteres, esperado: encabezado.totalCharacters },
    { clave: "frecuencias", ok: distintas.length === 0 && sobrantes.length === 0, obtenido: distintas.length + sobrantes.length, esperado: 0 },
    { clave: "bytes", ok: bytes === esperados, obtenido: bytes, esperado: esperados },
  ];
}

// Compara el texto recuperado con el .txt original, byte a byte. Si no son
// iguales, prueba quitando el BOM y cambiando \r\n por \n, que es la
// limpieza que hace el backend antes de comprimir.
// Devuelve { identico, normalizado, primeraDiferencia, bytes }.
export function compararConOriginal(texto, bytesOriginal) {
  const recuperado = new TextEncoder().encode(texto);
  const original = new Uint8Array(bytesOriginal);
  const primeraDiferente = (a, b) => {
    const largo = Math.min(a.length, b.length);
    for (let i = 0; i < largo; i += 1) if (a[i] !== b[i]) return i;
    return a.length === b.length ? -1 : largo;
  };
  const exacta = primeraDiferente(recuperado, original);
  if (exacta === -1) return { identico: true, normalizado: false, primeraDiferencia: -1, bytes: original.length };

  const limpio = new TextEncoder().encode(
    new TextDecoder().decode(original).replace(/^﻿/, "").replace(/\r\n/g, "\n")
  );
  const normalizada = primeraDiferente(recuperado, limpio);
  return {
    identico: normalizada === -1,
    normalizado: normalizada === -1,
    primeraDiferencia: normalizada === -1 ? -1 : exacta,
    bytes: original.length,
  };
}
