// Cola de prioridad (montículo binario mínimo) con una entrada por nodo.
// Además de insertar y extraer el mínimo, permite cambiar la prioridad de un
// nodo que ya está en la cola, que es lo que necesitan Dijkstra, A* y Prim.
//
// La prioridad es una lista de números que se compara de izquierda a
// derecha: el primero es el valor que ordena (distancia, f o clave) y los
// demás solo deciden los empates. Así el orden de salida siempre es el mismo.

function comparar(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export class Monticulo {
  #elementos = []; // [{ id, prioridad }]
  #posiciones = new Map(); // id → lugar en #elementos

  get tamano() {
    return this.#elementos.length;
  }

  estaVacio() {
    return this.#elementos.length === 0;
  }

  contiene(id) {
    return this.#posiciones.has(id);
  }

  // Inserta el nodo o, si ya está, le cambia la prioridad.
  // O(log n) en los dos casos.
  insertarOActualizar(id, prioridad) {
    if (this.#posiciones.has(id)) {
      const lugar = this.#posiciones.get(id);
      this.#elementos[lugar] = { id, prioridad };
      // La prioridad nueva puede ser menor o mayor: se prueba hacia los dos lados.
      this.#subir(lugar);
      this.#bajar(this.#posiciones.get(id));
      return;
    }
    this.#elementos.push({ id, prioridad });
    this.#posiciones.set(id, this.#elementos.length - 1);
    this.#subir(this.#elementos.length - 1);
  }

  // Quita y devuelve el nodo con la menor prioridad. O(log n).
  extraerMin() {
    if (this.estaVacio()) return null;

    const minimo = this.#elementos[0];
    const ultimo = this.#elementos.pop();
    this.#posiciones.delete(minimo.id);
    if (this.#elementos.length > 0) {
      this.#elementos[0] = ultimo;
      this.#posiciones.set(ultimo.id, 0);
      this.#bajar(0);
    }
    return minimo;
  }

  // Copia de la cola en el orden en que saldrían los nodos (para mostrarla).
  enOrden() {
    return [...this.#elementos].sort((a, b) => comparar(a.prioridad, b.prioridad));
  }

  #subir(lugar) {
    while (lugar > 0) {
      const padre = (lugar - 1) >> 1;
      if (!this.#vaAntes(lugar, padre)) break;
      this.#intercambiar(lugar, padre);
      lugar = padre;
    }
  }

  #bajar(lugar) {
    const total = this.#elementos.length;
    for (;;) {
      const izquierdo = 2 * lugar + 1;
      const derecho = izquierdo + 1;
      let menor = lugar;
      if (izquierdo < total && this.#vaAntes(izquierdo, menor)) menor = izquierdo;
      if (derecho < total && this.#vaAntes(derecho, menor)) menor = derecho;
      if (menor === lugar) return;
      this.#intercambiar(lugar, menor);
      lugar = menor;
    }
  }

  #vaAntes(i, j) {
    return comparar(this.#elementos[i].prioridad, this.#elementos[j].prioridad) < 0;
  }

  #intercambiar(i, j) {
    const elementos = this.#elementos;
    [elementos[i], elementos[j]] = [elementos[j], elementos[i]];
    this.#posiciones.set(elementos[i].id, i);
    this.#posiciones.set(elementos[j].id, j);
  }
}
