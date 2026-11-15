// Grafo escrito a mano: una arista por línea, "A B 7" (nodo, nodo, peso).
// Una línea con un solo nombre agrega un nodo sin aristas. Los decimales van
// con punto, porque la coma también separa ("A, B, 7").
import { ALTO_LIENZO, ANCHO_LIENZO } from "./ejemplos.js";
import { ErrorDeGrafo, crearGrafo } from "./grafo.js";

export const MAX_NODOS_TEXTO = 16;
export const MAX_ARISTAS_TEXTO = 40;

const SEPARADORES = /[\s,;]+/;

// El grafo como texto, para editarlo: es lo contrario de leerGrafo.
export function grafoATexto(grafo) {
  const conAristas = new Set(grafo.aristas.flatMap(({ a, b }) => [a, b]));
  const sueltos = grafo.nodos.filter(({ id }) => !conAristas.has(id)).map(({ id }) => id);
  return [...grafo.aristas.map(({ a, b, peso }) => `${a} ${b} ${peso}`), ...sueltos].join("\n");
}

// Reparte los nodos en un óvalo, empezando arriba y en el sentido del reloj.
function enOvalo(ids) {
  const radioX = ANCHO_LIENZO / 2 - 110;
  const radioY = ALTO_LIENZO / 2 - 70;
  return ids.map((id, i) => {
    const angulo = (2 * Math.PI * i) / ids.length - Math.PI / 2;
    return {
      id,
      x: Math.round(ANCHO_LIENZO / 2 + radioX * Math.cos(angulo)),
      y: Math.round(ALTO_LIENZO / 2 + radioY * Math.sin(angulo)),
    };
  });
}

// Convierte el texto en un grafo. Si todos los nodos ya existen en
// `posiciones` (el grafo que se está editando) se quedan donde estaban; si
// hay alguno nuevo, todos se reparten en un óvalo.
export function leerGrafo(texto, posiciones = null) {
  const ids = [];
  const aristas = [];
  const anotarNodo = (id) => {
    if (!ids.includes(id)) ids.push(id);
  };

  String(texto ?? "")
    .split(/\r?\n/)
    .forEach((linea, i) => {
      const partes = linea.trim().split(SEPARADORES).filter(Boolean);
      if (partes.length === 0) return;

      const donde = `Línea ${i + 1}`;
      if (partes.length === 1) {
        anotarNodo(partes[0]);
        return;
      }
      if (partes.length !== 3) {
        throw new ErrorDeGrafo(`${donde}: escribe dos nodos y un peso, por ejemplo «A B 7».`);
      }

      const [a, b, pesoTexto] = partes;
      const peso = Number(pesoTexto);
      if (!Number.isFinite(peso) || peso < 0) {
        throw new ErrorDeGrafo(`${donde}: «${pesoTexto}» no es un peso válido (número ≥ 0).`);
      }
      anotarNodo(a);
      anotarNodo(b);
      aristas.push({ a, b, peso });
    });

  if (ids.length === 0) throw new ErrorDeGrafo("Escribe al menos una arista, por ejemplo «A B 7».");
  if (ids.length > MAX_NODOS_TEXTO) {
    throw new ErrorDeGrafo(`El grafo tiene ${ids.length} nodos; el máximo es ${MAX_NODOS_TEXTO}.`);
  }
  if (aristas.length > MAX_ARISTAS_TEXTO) {
    throw new ErrorDeGrafo(
      `El grafo tiene ${aristas.length} aristas; el máximo es ${MAX_ARISTAS_TEXTO}.`
    );
  }

  // Si solo se cambiaron pesos o aristas, los nodos conservan también su
  // orden, que es el que decide los empates.
  const conocidas = new Map((posiciones?.nodos ?? []).map((nodo, lugar) => [nodo.id, { ...nodo, lugar }]));
  const nodos = ids.every((id) => conocidas.has(id))
    ? ids
        .map((id) => conocidas.get(id))
        .sort((p, q) => p.lugar - q.lugar)
        .map(({ id, x, y }) => ({ id, x, y }))
    : enOvalo(ids);

  // crearGrafo revisa el resto: nombres válidos, aristas repetidas, etc.
  return crearGrafo({ nombre: "Grafo propio", nodos, aristas });
}
