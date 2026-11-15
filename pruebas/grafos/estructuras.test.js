import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConjuntosDisjuntos } from "../../src/js/grafos/conjuntos.js";
import { Monticulo } from "../../src/js/grafos/monticulo.js";
import { crearAzar } from "./apoyo.js";

describe("Monticulo", () => {
  it("extrae siempre la menor prioridad", () => {
    const cola = new Monticulo();
    [5, 3, 8, 1, 9, 2, 7].forEach((valor, i) => cola.insertarOActualizar(`n${i}`, [valor, i]));
    const salida = [];
    while (!cola.estaVacio()) salida.push(cola.extraerMin().prioridad[0]);
    assert.deepEqual(salida, [1, 2, 3, 5, 7, 8, 9]);
  });

  it("desempata con el segundo valor de la prioridad", () => {
    const cola = new Monticulo();
    cola.insertarOActualizar("C", [4, 2]);
    cola.insertarOActualizar("A", [4, 0]);
    cola.insertarOActualizar("B", [4, 1]);
    assert.deepEqual(
      [cola.extraerMin().id, cola.extraerMin().id, cola.extraerMin().id],
      ["A", "B", "C"]
    );
  });

  it("actualiza la prioridad de un nodo que ya está, hacia arriba y hacia abajo", () => {
    const cola = new Monticulo();
    cola.insertarOActualizar("A", [10]);
    cola.insertarOActualizar("B", [20]);
    cola.insertarOActualizar("C", [30]);
    cola.insertarOActualizar("C", [5]); // baja: pasa al frente
    assert.equal(cola.tamano, 3);
    assert.equal(cola.enOrden()[0].id, "C");
    cola.insertarOActualizar("C", [25]); // sube: queda en medio
    cola.insertarOActualizar("A", [22]); // sube: deja el frente
    assert.deepEqual(
      cola.enOrden().map(({ id }) => id),
      ["B", "A", "C"]
    );
    assert.deepEqual(cola.extraerMin(), { id: "B", prioridad: [20] });
  });

  it("sabe qué contiene y devuelve null si está vacía", () => {
    const cola = new Monticulo();
    assert.equal(cola.extraerMin(), null);
    cola.insertarOActualizar("A", [1]);
    assert.equal(cola.contiene("A"), true);
    cola.extraerMin();
    assert.equal(cola.contiene("A"), false);
    assert.equal(cola.estaVacio(), true);
  });

  it("enOrden no cambia la cola", () => {
    const cola = new Monticulo();
    [4, 1, 3].forEach((valor, i) => cola.insertarOActualizar(`n${i}`, [valor]));
    cola.enOrden();
    cola.enOrden();
    assert.equal(cola.tamano, 3);
    assert.equal(cola.extraerMin().prioridad[0], 1);
  });

  it("se comporta igual que ordenar una lista, con 2 000 operaciones al azar", () => {
    const azar = crearAzar(7);
    const cola = new Monticulo();
    const referencia = new Map(); // id → prioridad
    for (let i = 0; i < 2000; i++) {
      const accion = azar();
      if (accion < 0.6 || referencia.size === 0) {
        const id = `n${Math.floor(azar() * 40)}`;
        const prioridad = [Math.floor(azar() * 50), Number(id.slice(1))];
        cola.insertarOActualizar(id, prioridad);
        referencia.set(id, prioridad);
      } else {
        const esperado = [...referencia.entries()].sort(
          ([, p], [, q]) => p[0] - q[0] || p[1] - q[1]
        )[0];
        const obtenido = cola.extraerMin();
        assert.equal(obtenido.id, esperado[0]);
        assert.deepEqual(obtenido.prioridad, esperado[1]);
        referencia.delete(esperado[0]);
      }
      assert.equal(cola.tamano, referencia.size);
    }
  });
});

describe("ConjuntosDisjuntos", () => {
  it("empieza con un grupo por elemento", () => {
    const conjuntos = new ConjuntosDisjuntos(["A", "B", "C"]);
    assert.deepEqual(conjuntos.grupos(), [["A"], ["B"], ["C"]]);
    assert.equal(conjuntos.estanUnidos("A", "B"), false);
  });

  it("une grupos y avisa cuando ya estaban unidos", () => {
    const conjuntos = new ConjuntosDisjuntos(["A", "B", "C", "D"]);
    assert.equal(conjuntos.unir("A", "B"), true);
    assert.equal(conjuntos.unir("C", "D"), true);
    assert.equal(conjuntos.unir("B", "A"), false);
    assert.equal(conjuntos.estanUnidos("A", "C"), false);
    assert.equal(conjuntos.unir("B", "D"), true);
    assert.equal(conjuntos.estanUnidos("A", "C"), true);
    assert.equal(conjuntos.unir("A", "D"), false);
  });

  it("muestra los grupos en el orden original de los elementos", () => {
    const conjuntos = new ConjuntosDisjuntos(["A", "B", "C", "D", "E"]);
    conjuntos.unir("E", "B");
    conjuntos.unir("D", "A");
    assert.deepEqual(conjuntos.grupos(), [["A", "D"], ["B", "E"], ["C"]]);
  });

  it("coincide con una versión simple en 500 uniones al azar", () => {
    const azar = crearAzar(11);
    const ids = Array.from({ length: 30 }, (_, i) => `n${i}`);
    const conjuntos = new ConjuntosDisjuntos(ids);
    const etiqueta = new Map(ids.map((id) => [id, id])); // referencia: etiqueta por elemento
    for (let i = 0; i < 500; i++) {
      const a = ids[Math.floor(azar() * ids.length)];
      const b = ids[Math.floor(azar() * ids.length)];
      const distintos = etiqueta.get(a) !== etiqueta.get(b);
      assert.equal(conjuntos.estanUnidos(a, b), !distintos);
      assert.equal(conjuntos.unir(a, b), distintos);
      if (distintos) {
        const vieja = etiqueta.get(b);
        const nueva = etiqueta.get(a);
        for (const id of ids) if (etiqueta.get(id) === vieja) etiqueta.set(id, nueva);
      }
    }
  });
});
