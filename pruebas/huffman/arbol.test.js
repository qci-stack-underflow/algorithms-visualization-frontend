// Posición de los nodos del árbol de Huffman (bloque D, arbol/layout.js).
// El id 0 es la primera hoja del texto: es el caso que más fácil se pierde
// si se usa `if (id)` en lugar de comparar con null.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calcularLayoutArbol, limitesDePosiciones } from "../../src/js/huffman/arbol/layout.js";
import { comprimirEnNavegador } from "../../src/js/huffman/compresor.js";

const porId = (nodes) => Object.fromEntries(nodes.map((nodo) => [nodo.id, nodo]));

function arbolDe(texto) {
  const { resultado } = comprimirEnNavegador(texto, {
    titulo: "Prueba",
    archivo: { nombre: "prueba.txt", bytes: texto.length },
  });
  return resultado;
}

function comprobarPosiciones(resultado) {
  const nodos = porId(resultado.nodes);
  const posiciones = calcularLayoutArbol(nodos, resultado.rootId);

  assert.equal(posiciones.size, resultado.nodes.length, "cada nodo tiene posición");
  assert.ok(posiciones.has(0), "la primera hoja (id 0) tiene posición");

  // Las hojas no se enciman: cada una tiene su propia x.
  const xs = resultado.nodes.filter((n) => n.isLeaf).map((n) => posiciones.get(n.id).x);
  assert.equal(new Set(xs).size, xs.length);

  // Cada hijo queda un nivel abajo de su padre.
  for (const nodo of resultado.nodes) {
    for (const hijo of [nodo.left, nodo.right]) {
      if (hijo == null) continue;
      assert.equal(posiciones.get(hijo).depth, posiciones.get(nodo.id).depth + 1);
    }
  }
  return posiciones;
}

describe("calcularLayoutArbol", () => {
  it("da posición a los 19 nodos de un texto corto, incluida la primera letra", () => {
    const resultado = arbolDe("abracadabra alakazam zzzzzzzzzzzzzzz");
    assert.equal(resultado.nodes[0].symbol, "a");
    comprobarPosiciones(resultado);
  });

  it("da posición a los 183 nodos del Quijote de ejemplo", () => {
    const quijote = JSON.parse(
      readFileSync(new URL("../../src/js/huffman/ejemplo-quijote.json", import.meta.url), "utf8")
    );
    comprobarPosiciones(quijote);
  });

  it("dibuja el árbol de un solo símbolo, cuya raíz es el id 0", () => {
    const resultado = arbolDe("aaaa");
    assert.equal(resultado.rootId, 0);
    const posiciones = comprobarPosiciones(resultado);
    assert.equal(posiciones.get(0).depth, 0);
  });

  it("no falla sin raíz ni nodos", () => {
    assert.equal(calcularLayoutArbol({}, null).size, 0);
    assert.equal(calcularLayoutArbol(null, 0).size, 0);
  });
});

describe("limitesDePosiciones", () => {
  it("da la caja que ocupan todos los nodos", () => {
    const posiciones = new Map([
      [0, { x: 20, y: 100 }],
      [1, { x: 80, y: 100 }],
      [2, { x: 50, y: 20 }],
    ]);
    assert.deepEqual(limitesDePosiciones(posiciones), { xMin: 20, xMax: 80, yMin: 20, yMax: 100 });
  });

  it("devuelve null sin nodos", () => {
    assert.equal(limitesDePosiciones(new Map()), null);
  });
});
