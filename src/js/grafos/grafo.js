// Modelo de grafo de la pantalla de grafos: no dirigido, con un peso por
// arista y una posición (x, y) por nodo. La posición sirve para dibujarlo y
// para la heurística de A*.
//
// Este archivo y los algoritmos no usan nada del navegador: son funciones
// puras que también corren en Node (ver pruebas/grafos).

// Los nombres de nodo son cortos porque se escriben dentro del círculo.
const NOMBRE_VALIDO = /^[\p{L}\p{N}]{1,4}$/u;

export class ErrorDeGrafo extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorDeGrafo";
  }
}

// La arista no tiene dirección, así que su id pone primero al nodo que
// aparece antes en la lista: A-B y B-A son la misma arista "A-B".
function idDeArista(indice, a, b) {
  return indice.get(a) <= indice.get(b) ? `${a}-${b}` : `${b}-${a}`;
}

// Revisa los datos y devuelve el grafo listo para los algoritmos:
//   nodos       [{ id, x, y }]
//   aristas     [{ id, a, b, peso }]  (a es el nodo que va antes en la lista)
//   indice      Map id → posición en `nodos` (sirve para desempatar)
//   adyacencia  Map id → [{ nodo, peso, arista }], vecinos en el orden de `nodos`
export function crearGrafo({ nombre = "", nodos = [], aristas = [] } = {}) {
  if (!Array.isArray(nodos) || nodos.length === 0) {
    throw new ErrorDeGrafo("El grafo necesita al menos un nodo.");
  }

  const indice = new Map();
  const listaNodos = nodos.map((nodo, posicion) => {
    const id = String(nodo?.id ?? "");
    if (!NOMBRE_VALIDO.test(id)) {
      throw new ErrorDeGrafo(
        `«${id}» no sirve como nombre de nodo: usa de 1 a 4 letras o números.`
      );
    }
    if (indice.has(id)) throw new ErrorDeGrafo(`El nodo ${id} está repetido.`);
    if (!Number.isFinite(nodo.x) || !Number.isFinite(nodo.y)) {
      throw new ErrorDeGrafo(`El nodo ${id} no tiene una posición válida.`);
    }
    indice.set(id, posicion);
    return Object.freeze({ id, x: nodo.x, y: nodo.y });
  });

  const adyacencia = new Map(listaNodos.map((nodo) => [nodo.id, []]));
  const vistas = new Set();
  const listaAristas = (aristas ?? []).map((arista) => {
    const a = String(arista?.a ?? "");
    const b = String(arista?.b ?? "");
    for (const extremo of [a, b]) {
      if (!indice.has(extremo)) {
        throw new ErrorDeGrafo(`La arista ${a}–${b} usa el nodo ${extremo}, que no existe.`);
      }
    }
    if (a === b) throw new ErrorDeGrafo(`La arista ${a}–${b} une un nodo consigo mismo.`);
    // Dijkstra y A* no funcionan con pesos negativos.
    if (!Number.isFinite(arista.peso) || arista.peso < 0) {
      throw new ErrorDeGrafo(`El peso de ${a}–${b} debe ser un número mayor o igual a 0.`);
    }

    const id = idDeArista(indice, a, b);
    if (vistas.has(id)) throw new ErrorDeGrafo(`La arista ${a}–${b} está repetida.`);
    vistas.add(id);

    const [primero, segundo] = id.split("-");
    adyacencia.get(a).push({ nodo: b, peso: arista.peso, arista: id });
    adyacencia.get(b).push({ nodo: a, peso: arista.peso, arista: id });
    return Object.freeze({ id, a: primero, b: segundo, peso: arista.peso });
  });

  // Los vecinos siempre se recorren en el orden de la lista de nodos, para
  // que los pasos salgan iguales en cada ejecución.
  for (const vecinos of adyacencia.values()) {
    vecinos.sort((p, q) => indice.get(p.nodo) - indice.get(q.nodo));
    Object.freeze(vecinos);
  }

  return Object.freeze({
    nombre,
    nodos: Object.freeze(listaNodos),
    aristas: Object.freeze(listaAristas),
    indice,
    adyacencia,
  });
}

export function tieneNodo(grafo, id) {
  return grafo.indice.has(id);
}

export function exigirNodo(grafo, id, papel) {
  if (!tieneNodo(grafo, id)) {
    throw new ErrorDeGrafo(`El nodo de ${papel} «${id}» no existe en el grafo.`);
  }
}

export function vecinosDe(grafo, id) {
  return grafo.adyacencia.get(id) ?? [];
}

export function nodoPorId(grafo, id) {
  return grafo.nodos[grafo.indice.get(id)];
}

export function idArista(grafo, a, b) {
  return idDeArista(grafo.indice, a, b);
}

// Grupos de nodos unidos entre sí, cada uno en el orden de la lista.
export function componentes(grafo) {
  const vistos = new Set();
  const grupos = [];

  for (const { id } of grafo.nodos) {
    if (vistos.has(id)) continue;
    const grupo = [];
    const pendientes = [id];
    vistos.add(id);
    while (pendientes.length > 0) {
      const actual = pendientes.pop();
      grupo.push(actual);
      for (const { nodo } of vecinosDe(grafo, actual)) {
        if (vistos.has(nodo)) continue;
        vistos.add(nodo);
        pendientes.push(nodo);
      }
    }
    grupo.sort((p, q) => grafo.indice.get(p) - grafo.indice.get(q));
    grupos.push(grupo);
  }
  return grupos;
}

export function esConexo(grafo) {
  return componentes(grafo).length === 1;
}
