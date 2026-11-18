import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ErrorDeGrafo,
  componentes,
  crearGrafo,
  esConexo,
  idArista,
  vecinosDe,
} from "../../src/js/grafos/grafo.js";

const nodos = [
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 10, y: 0 },
  { id: "C", x: 0, y: 10 },
  { id: "D", x: 10, y: 10 },
];

describe("crearGrafo", () => {
  it("arma la lista de vecinos en los dos sentidos y en el orden de los nodos", () => {
    const grafo = crearGrafo({
      nodos,
      aristas: [
        { a: "D", b: "A", peso: 4 },
        { a: "A", b: "C", peso: 2 },
        { a: "B", b: "A", peso: 7 },
      ],
    });
    assert.deepEqual(
      vecinosDe(grafo, "A").map(({ nodo, peso }) => [nodo, peso]),
      [
        ["B", 7],
        ["C", 2],
        ["D", 4],
      ]
    );
    assert.deepEqual(vecinosDe(grafo, "D"), [{ nodo: "A", peso: 4, arista: "A-D" }]);
  });

  it("da a cada arista un id que no depende del sentido", () => {
    const grafo = crearGrafo({ nodos, aristas: [{ a: "D", b: "B", peso: 1 }] });
    assert.equal(grafo.aristas[0].id, "B-D");
    assert.deepEqual([grafo.aristas[0].a, grafo.aristas[0].b], ["B", "D"]);
    assert.equal(idArista(grafo, "D", "B"), "B-D");
    assert.equal(idArista(grafo, "B", "D"), "B-D");
  });

  it("acepta peso 0 y pesos con decimales", () => {
    const grafo = crearGrafo({
      nodos,
      aristas: [
        { a: "A", b: "B", peso: 0 },
        { a: "B", b: "C", peso: 2.5 },
      ],
    });
    assert.deepEqual(
      grafo.aristas.map(({ peso }) => peso),
      [0, 2.5]
    );
  });

  const invalidos = {
    "sin nodos": { nodos: [], aristas: [] },
    "nodo repetido": { nodos: [...nodos, { id: "A", x: 1, y: 1 }], aristas: [] },
    "nombre vacío": { nodos: [{ id: "", x: 0, y: 0 }], aristas: [] },
    "nombre con guion": { nodos: [{ id: "A-B", x: 0, y: 0 }], aristas: [] },
    "nombre largo": { nodos: [{ id: "NODOS", x: 0, y: 0 }], aristas: [] },
    "nodo sin posición": { nodos: [{ id: "A", x: NaN, y: 0 }], aristas: [] },
    "arista a un nodo que no existe": { nodos, aristas: [{ a: "A", b: "Z", peso: 1 }] },
    "arista de un nodo a sí mismo": { nodos, aristas: [{ a: "A", b: "A", peso: 1 }] },
    "peso negativo": { nodos, aristas: [{ a: "A", b: "B", peso: -1 }] },
    "peso que no es número": { nodos, aristas: [{ a: "A", b: "B", peso: "x" }] },
    "peso infinito": { nodos, aristas: [{ a: "A", b: "B", peso: Infinity }] },
    "arista repetida al revés": {
      nodos,
      aristas: [
        { a: "A", b: "B", peso: 1 },
        { a: "B", b: "A", peso: 2 },
      ],
    },
  };
  for (const [caso, datos] of Object.entries(invalidos)) {
    it(`rechaza: ${caso}`, () => {
      assert.throws(() => crearGrafo(datos), ErrorDeGrafo);
    });
  }

  it("no deja modificar el grafo", () => {
    const grafo = crearGrafo({ nodos, aristas: [{ a: "A", b: "B", peso: 1 }] });
    assert.throws(() => grafo.nodos.push({ id: "Z", x: 0, y: 0 }), TypeError);
    assert.throws(() => (grafo.aristas[0].peso = 99), TypeError);
  });
});

describe("componentes", () => {
  it("separa las partes que no están unidas", () => {
    const grafo = crearGrafo({
      nodos,
      aristas: [
        { a: "A", b: "D", peso: 1 },
        { a: "B", b: "C", peso: 1 },
      ],
    });
    assert.deepEqual(componentes(grafo), [
      ["A", "D"],
      ["B", "C"],
    ]);
    assert.equal(esConexo(grafo), false);
  });

  it("un grafo unido tiene una sola", () => {
    const grafo = crearGrafo({
      nodos,
      aristas: [
        { a: "A", b: "B", peso: 1 },
        { a: "B", b: "C", peso: 1 },
        { a: "C", b: "D", peso: 1 },
      ],
    });
    assert.equal(esConexo(grafo), true);
  });
});
