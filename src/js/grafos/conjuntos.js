// Conjuntos disjuntos (union-find) para Kruskal: dice si dos nodos ya están
// conectados y une sus grupos. Usa unión por tamaño y compresión de caminos,
// así que cada operación cuesta casi O(1).

export class ConjuntosDisjuntos {
  #padre = new Map();
  #tamano = new Map();
  #orden; // ids en el orden original, para mostrar los grupos siempre igual

  constructor(ids) {
    this.#orden = [...ids];
    for (const id of this.#orden) {
      this.#padre.set(id, id);
      this.#tamano.set(id, 1);
    }
  }

  // Representante del grupo de `id`.
  encontrar(id) {
    let raiz = id;
    while (this.#padre.get(raiz) !== raiz) raiz = this.#padre.get(raiz);

    // Compresión de caminos: todo el recorrido queda apuntando a la raíz.
    let actual = id;
    while (actual !== raiz) {
      const siguiente = this.#padre.get(actual);
      this.#padre.set(actual, raiz);
      actual = siguiente;
    }
    return raiz;
  }

  estanUnidos(a, b) {
    return this.encontrar(a) === this.encontrar(b);
  }

  // Une los grupos de `a` y `b`. Devuelve false si ya eran el mismo.
  unir(a, b) {
    let raizA = this.encontrar(a);
    let raizB = this.encontrar(b);
    if (raizA === raizB) return false;

    // El grupo chico se cuelga del grande para que los árboles queden bajos.
    if (this.#tamano.get(raizA) < this.#tamano.get(raizB)) [raizA, raizB] = [raizB, raizA];
    this.#padre.set(raizB, raizA);
    this.#tamano.set(raizA, this.#tamano.get(raizA) + this.#tamano.get(raizB));
    return true;
  }

  // Los grupos actuales, cada uno con sus nodos en el orden original.
  grupos() {
    const porRaiz = new Map();
    for (const id of this.#orden) {
      const raiz = this.encontrar(id);
      if (!porRaiz.has(raiz)) porRaiz.set(raiz, []);
      porRaiz.get(raiz).push(id);
    }
    return [...porRaiz.values()];
  }
}
