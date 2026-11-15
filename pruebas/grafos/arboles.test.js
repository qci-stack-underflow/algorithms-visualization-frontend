// Prim y Kruskal: resultados conocidos y comparación contra fuerza bruta.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ejemploPorId } from "../../src/js/grafos/ejemplos.js";
import { grafoAleatorio } from "../../src/js/grafos/generador.js";
import { ErrorDeGrafo, crearGrafo } from "../../src/js/grafos/grafo.js";
import { kruskal } from "../../src/js/grafos/kruskal.js";
import { prim } from "../../src/js/grafos/prim.js";
import {
  contarComponentes,
  crearAzar,
  grafoDePrueba,
  pesoMinimoDeReferencia,
  porId,
} from "./apoyo.js";

const clasico = ejemploPorId("clasico").grafo;
const islas = ejemploPorId("islas").grafo;

const ids = (grafo) => grafo.nodos.map(({ id }) => id);
const elegidas = (grafo, resultado) => resultado.aristas.map((id) => porId(grafo).get(id));
const suma = (aristas) => aristas.reduce((total, { peso }) => total + peso, 0);

describe("Kruskal", () => {
  it("encuentra el árbol del grafo clásico (peso 39)", () => {
    const { resultado, metricas } = kruskal(clasico);
    assert.equal(resultado.pesoTotal, 39);
    assert.deepEqual(resultado.aristas, ["A-D", "C-E", "D-F", "A-B", "B-E", "E-G"]);
    assert.equal(resultado.conexo, true);
    assert.equal(resultado.arboles, 1);
    assert.deepEqual(metricas, { aristasRevisadas: 9, aristasAceptadas: 6, aristasDescartadas: 3 });
  });

  it("revisa las aristas de menor a mayor peso y respeta el orden original en empates", () => {
    const { pasos } = kruskal(clasico);
    const pesos = porId(clasico);
    const orden = pasos[0].orden;
    assert.equal(orden.length, clasico.aristas.length);
    for (let i = 1; i < orden.length; i++) {
      assert.ok(pesos.get(orden[i - 1]).peso <= pesos.get(orden[i]).peso);
    }
    assert.deepEqual(orden.slice(0, 2), ["A-D", "C-E"]); // los dos de peso 5
  });

  it("descarta justo las aristas que cerrarían un ciclo", () => {
    const { pasos } = kruskal(clasico);
    const descartadas = pasos.filter(({ tipo }) => tipo === "rechazar").map(({ arista }) => arista);
    assert.deepEqual(descartadas, ["B-C", "E-F", "B-D"]);
  });

  it("se detiene al completar n − 1 aristas", () => {
    const { resultado } = kruskal(clasico);
    assert.equal(resultado.sinRevisar, 2); // F-G (11) y D-E (15)
  });

  it("en un grafo no conexo devuelve un bosque", () => {
    const { resultado } = kruskal(islas);
    assert.equal(resultado.conexo, false);
    assert.equal(resultado.arboles, 2);
    assert.equal(resultado.aristas.length, 5); // 7 nodos − 2 partes
    assert.equal(resultado.pesoTotal, 21);
  });

  it("un grafo sin aristas da un bosque de nodos sueltos", () => {
    const grafo = crearGrafo({
      nodos: ["A", "B", "C"].map((id, i) => ({ id, x: i, y: 0 })),
      aristas: [],
    });
    const { resultado, pasos } = kruskal(grafo);
    assert.deepEqual(resultado.aristas, []);
    assert.equal(resultado.arboles, 3);
    assert.equal(resultado.pesoTotal, 0);
    assert.deepEqual(
      pasos.map(({ tipo }) => tipo),
      ["inicio", "fin"]
    );
  });
});

describe("Prim", () => {
  it("encuentra el árbol del grafo clásico (peso 39)", () => {
    const { resultado } = prim(clasico, { origen: "A" });
    assert.equal(resultado.pesoTotal, 39);
    assert.deepEqual(resultado.aristas, ["A-D", "D-F", "A-B", "B-E", "C-E", "E-G"]);
    assert.equal(resultado.conexo, true);
  });

  it("da el mismo peso sin importar el nodo inicial", () => {
    for (const origen of ids(clasico)) {
      assert.equal(prim(clasico, { origen }).resultado.pesoTotal, 39, `desde ${origen}`);
    }
  });

  it("agrega los nodos de uno en uno, siempre unidos al árbol", () => {
    const { pasos } = prim(clasico, { origen: "A" });
    const dentro = new Set();
    for (const paso of pasos.filter(({ tipo }) => tipo === "extraer")) {
      if (paso.arista) {
        const [a, b] = paso.arista.split("-");
        // Un extremo ya estaba en el árbol y el otro es el nodo nuevo.
        assert.ok(dentro.has(a) !== dentro.has(b), paso.arista);
      }
      dentro.add(paso.nodo);
    }
    assert.equal(dentro.size, clasico.nodos.length);
  });

  it("en un grafo no conexo solo cubre la parte del nodo inicial", () => {
    const desdeA = prim(islas, { origen: "A" }).resultado;
    assert.equal(desdeA.conexo, false);
    assert.equal(desdeA.nodosEnArbol, 4);
    assert.equal(desdeA.pesoTotal, 12);
    const desdeE = prim(islas, { origen: "E" }).resultado;
    assert.equal(desdeE.nodosEnArbol, 3);
    assert.equal(desdeE.pesoTotal, 9);
  });

  it("rechaza un nodo inicial que no existe", () => {
    assert.throws(() => prim(clasico, { origen: "Z" }), ErrorDeGrafo);
    assert.throws(() => prim(clasico), ErrorDeGrafo);
  });
});

describe("Prim y Kruskal contra fuerza bruta", () => {
  it("dan el peso mínimo en 400 grafos al azar (conexos o no)", () => {
    const azar = crearAzar(1957);
    let conexos = 0;
    for (let caso = 0; caso < 400; caso++) {
      // Hasta 6 nodos: a lo más 15 aristas, 32 768 subconjuntos por grafo.
      const grafo = grafoDePrueba(azar, {
        nodos: 2 + Math.floor(azar() * 5),
        probabilidad: 0.3 + azar() * 0.6,
        pesoMaximo: caso % 3 === 0 ? 2 : 9, // muchos empates en un tercio
      });
      const referencia = pesoMinimoDeReferencia(grafo);
      const partes = contarComponentes(ids(grafo), grafo.aristas);

      const k = kruskal(grafo).resultado;
      assert.equal(k.pesoTotal, referencia, `caso ${caso}: Kruskal`);
      assert.equal(k.arboles, partes);
      assert.equal(k.aristas.length, grafo.nodos.length - partes);
      assert.equal(suma(elegidas(grafo, k)), k.pesoTotal);
      // Sin ciclos y cubriendo todo: deja las mismas partes que el grafo.
      assert.equal(contarComponentes(ids(grafo), elegidas(grafo, k)), partes);

      if (partes === 1) {
        conexos++;
        for (const origen of ids(grafo)) {
          const p = prim(grafo, { origen }).resultado;
          assert.equal(p.pesoTotal, referencia, `caso ${caso}: Prim desde ${origen}`);
          assert.equal(p.conexo, true);
          assert.equal(p.aristas.length, grafo.nodos.length - 1);
          assert.equal(suma(elegidas(grafo, p)), p.pesoTotal);
          assert.equal(contarComponentes(ids(grafo), elegidas(grafo, p)), 1);
        }
      } else {
        assert.equal(prim(grafo, { origen: "A" }).resultado.conexo, false);
      }
    }
    assert.ok(conexos > 100, `solo ${conexos} grafos conexos`);
  });

  it("coinciden entre sí en 200 grafos generados para la pantalla", () => {
    for (let semilla = 0; semilla < 200; semilla++) {
      const grafo = grafoAleatorio({ nodos: 4 + (semilla % 11), semilla });
      const k = kruskal(grafo).resultado;
      const p = prim(grafo, { origen: grafo.nodos[semilla % grafo.nodos.length].id }).resultado;
      assert.equal(p.pesoTotal, k.pesoTotal, `semilla ${semilla}`);
      assert.equal(p.aristas.length, grafo.nodos.length - 1);
      assert.equal(k.aristas.length, grafo.nodos.length - 1);
    }
  });
});
