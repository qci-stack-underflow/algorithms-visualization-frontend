// Registro de pasos de un algoritmo de grafos.
//
// Cada paso es una foto completa: qué se hizo, qué línea del pseudocódigo lo
// hizo y cómo quedó todo el grafo. Con fotos completas el reproductor puede
// saltar a cualquier paso, hacia adelante o hacia atrás, sin recalcular nada.
//
// Campos comunes de un paso:
//   tipo     qué operación fue ("inicio", "extraer", "relajar", "fin", …)
//   linea    línea del pseudocódigo, contando desde 0
//   nodo     nodo que se está procesando (o null)
//   vecino   vecino que se revisa en este paso (o null)
//   arista   arista que se revisa en este paso (o null)
//   nodos    estado de cada nodo: "nuevo" | "frontera" | "cerrado"
//   aristas  estado de cada arista: "normal" | "candidata" | "arbol" | "descartada"
// Cada algoritmo agrega sus propias tablas (distancias, cola, conjuntos…).
//
// Los pasos no llevan Infinity ni funciones, solo datos que caben en un
// JSON: una distancia infinita se guarda como null.

export const NODO = Object.freeze({
  NUEVO: "nuevo", // todavía no se llega a él
  FRONTERA: "frontera", // está en la cola de prioridad
  CERRADO: "cerrado", // su valor ya es definitivo / ya es parte del árbol
});

export const ARISTA = Object.freeze({
  NORMAL: "normal",
  CANDIDATA: "candidata", // mejor conexión conocida hacia un nodo de la frontera
  ARBOL: "arbol", // ya es parte del resultado
  DESCARTADA: "descartada", // no forma parte del resultado
});

export function crearRegistro(grafo) {
  const nodos = Object.fromEntries(grafo.nodos.map(({ id }) => [id, NODO.NUEVO]));
  const aristas = Object.fromEntries(grafo.aristas.map(({ id }) => [id, ARISTA.NORMAL]));
  const pasos = [];

  return {
    nodos,
    aristas,
    pasos,
    anotar(tipo, linea, datos = {}) {
      pasos.push({
        tipo,
        linea,
        nodo: null,
        vecino: null,
        arista: null,
        ...datos,
        nodos: { ...nodos },
        aristas: { ...aristas },
      });
    },
  };
}

// Infinity → null, para que el paso se pueda convertir a JSON.
export const finito = (valor) => (Number.isFinite(valor) ? valor : null);

export function copiaFinita(tabla) {
  return Object.fromEntries(Object.entries(tabla).map(([id, valor]) => [id, finito(valor)]));
}

// La cola tal como se muestra: en orden de salida y solo con el valor que
// ordena (los desempates no se enseñan).
export function colaVisible(cola) {
  return cola.enOrden().map(({ id, prioridad }) => ({ nodo: id, prioridad: prioridad[0] }));
}

// Sigue `previo` desde el destino hasta el origen. Devuelve los nodos del
// camino en orden y las aristas que lo forman, o null si no hay camino.
export function reconstruirRuta(grafo, previo, origen, destino, idArista) {
  const ruta = [destino];
  const aristasRuta = [];
  let actual = destino;
  while (actual !== origen) {
    const anterior = previo[actual];
    if (anterior === null || anterior === undefined) return null;
    aristasRuta.unshift(idArista(grafo, anterior, actual));
    ruta.unshift(anterior);
    actual = anterior;
  }
  return { ruta, aristasRuta };
}
