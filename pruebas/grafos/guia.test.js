// La guía «¿Cómo funciona?» cuenta un ejemplo con números concretos. Aquí se
// ejecutan los algoritmos de verdad sobre el grafo de la guía para que esos
// números no se puedan quedar desactualizados.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORDEN_ALGORITMOS } from "../../src/js/grafos/algoritmos.js";
import { aEstrella } from "../../src/js/grafos/a-estrella.js";
import { dijkstra } from "../../src/js/grafos/dijkstra.js";
import { GRAFO_GUIA, GUIAS, H_GUIA } from "../../src/js/grafos/guia.js";
import { kruskal } from "../../src/js/grafos/kruskal.js";
import { prim } from "../../src/js/grafos/prim.js";

const TIPOS = new Set(["p", "lista", "formula", "nota", "tabla", "diagrama", "fila"]);
const ESTADOS_NODO = new Set(["nuevo", "frontera", "cerrado", "ruta", "apagado"]);
const ESTADOS_ARISTA = new Set(["normal", "arbol", "ruta", "candidata", "descartada"]);

// Orden en que salen los nodos de la cola.
const extraidos = (pasos) => pasos.filter(({ tipo }) => tipo === "extraer").map(({ nodo }) => nodo);
// Pares «sale → valores tras revisar sus vecinos», como en las tablas.
const colaTrasCadaNodo = (pasos) => {
  const resultado = [];
  pasos.forEach((paso, i) => {
    if (paso.tipo !== "extraer") return;
    const siguiente = pasos.slice(i + 1).find(({ tipo }) => tipo === "extraer" || tipo === "fin");
    const antes = pasos[pasos.indexOf(siguiente) - 1];
    resultado.push([paso.nodo, antes.cola.map(({ nodo, prioridad }) => `${nodo} ${prioridad}`).join(" · ")]);
  });
  return resultado;
};

describe("Guía de los algoritmos", () => {
  it("hay una guía con varias páginas para cada algoritmo", () => {
    for (const id of ORDEN_ALGORITMOS) {
      const guia = GUIAS[id];
      assert.ok(guia, id);
      assert.ok(guia.paginas.length >= 3, id);
      for (const pagina of guia.paginas) {
        assert.ok(pagina.titulo, id);
        assert.ok(pagina.bloques.length > 0, `${id}: ${pagina.titulo}`);
      }
    }
  });

  it("los bloques son de tipos conocidos y los diagramas usan nodos y aristas que existen", () => {
    const revisar = (bloque, donde) => {
      assert.ok(TIPOS.has(bloque.tipo), `${donde}: ${bloque.tipo}`);
      if (bloque.tipo === "fila") bloque.bloques.forEach((b) => revisar(b, donde));
      if (bloque.tipo === "tabla") {
        for (const fila of bloque.filas) assert.equal(fila.length, bloque.columnas.length, donde);
      }
      if (bloque.tipo !== "diagrama") return;
      for (const [id, estado] of Object.entries(bloque.nodos ?? {})) {
        assert.ok(GRAFO_GUIA.indice.has(id), `${donde}: nodo ${id}`);
        assert.ok(ESTADOS_NODO.has(estado), `${donde}: ${estado}`);
      }
      const aristas = new Set(GRAFO_GUIA.aristas.map(({ id }) => id));
      for (const [id, estado] of Object.entries(bloque.aristas ?? {})) {
        assert.ok(aristas.has(id), `${donde}: arista ${id}`);
        assert.ok(ESTADOS_ARISTA.has(estado), `${donde}: ${estado}`);
      }
      for (const id of [...Object.keys(bloque.valores ?? {}), ...Object.keys(bloque.papeles ?? {})]) {
        assert.ok(GRAFO_GUIA.indice.has(id), `${donde}: ${id}`);
      }
    };
    for (const [id, { paginas }] of Object.entries(GUIAS)) {
      for (const { titulo, bloques } of paginas) bloques.forEach((b) => revisar(b, `${id} / ${titulo}`));
    }
  });

  it("Dijkstra: el orden, las colas y la ruta de la tabla", () => {
    const { pasos, resultado } = dijkstra(GRAFO_GUIA, { origen: "A", destino: "D" });
    assert.deepEqual(extraidos(pasos), ["A", "C", "E", "B", "D"]);
    assert.deepEqual(colaTrasCadaNodo(pasos).slice(0, 4), [
      ["A", "C 1 · E 2 · B 5"],
      ["C", "E 2 · B 4 · D 6"],
      ["E", "B 4 · D 6"],
      ["B", "D 5"],
    ]);
    assert.deepEqual(resultado.ruta, ["A", "C", "B", "D"]);
    assert.equal(resultado.costo, 5);
    assert.deepEqual(resultado.dist, { A: 0, B: 4, C: 1, D: 5, E: 2 });
  });

  it("A*: la heurística es consistente y E nunca sale de la cola", () => {
    for (const { a, b, peso } of GRAFO_GUIA.aristas) {
      assert.ok(H_GUIA[a] <= peso + H_GUIA[b], `${a}–${b}`);
      assert.ok(H_GUIA[b] <= peso + H_GUIA[a], `${b}–${a}`);
    }
    const { pasos, resultado } = aEstrella(GRAFO_GUIA, {
      origen: "A",
      destino: "D",
      heuristica: { valores: H_GUIA },
    });
    assert.deepEqual(extraidos(pasos), ["A", "C", "B", "D"]);
    assert.deepEqual(colaTrasCadaNodo(pasos).slice(0, 3), [
      ["A", "C 4 · B 6 · E 8"],
      ["C", "B 5 · D 6 · E 8"],
      ["B", "D 5 · E 8"],
    ]);
    assert.deepEqual(resultado.ruta, ["A", "C", "B", "D"]);
    assert.equal(resultado.costo, 5);
  });

  it("Prim: el orden de entrada, las claves y el peso total", () => {
    const { pasos, resultado } = prim(GRAFO_GUIA, { origen: "A" });
    assert.deepEqual(extraidos(pasos), ["A", "C", "E", "B", "D"]);
    assert.deepEqual(colaTrasCadaNodo(pasos).slice(0, 4), [
      ["A", "C 1 · E 2 · B 5"],
      ["C", "E 2 · B 3 · D 5"],
      ["E", "B 3 · D 5"],
      ["B", "D 1"],
    ]);
    assert.deepEqual(resultado.aristas, ["A-C", "A-E", "B-C", "B-D"]);
    assert.equal(resultado.pesoTotal, 7);
  });

  it("Kruskal: acepta cuatro aristas en ese orden y se detiene", () => {
    const { pasos, resultado } = kruskal(GRAFO_GUIA);
    assert.deepEqual(pasos[0].orden, ["A-C", "B-D", "A-E", "B-C", "A-B", "C-D"]);
    assert.deepEqual(
      pasos.filter(({ tipo }) => tipo === "aceptar" || tipo === "rechazar").map((p) => `${p.tipo} ${p.arista}`),
      ["aceptar A-C", "aceptar B-D", "aceptar A-E", "aceptar B-C"]
    );
    assert.deepEqual(resultado.aristas, ["A-C", "B-D", "A-E", "B-C"]);
    assert.equal(resultado.pesoTotal, 7);
  });
});
