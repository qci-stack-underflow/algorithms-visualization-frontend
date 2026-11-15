// La dirección de la pantalla (#/algoritmo?grafo=…) se lee y se escribe igual.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TODOS, escribirRuta, leerRuta } from "../../src/js/grafos/ruta.js";

describe("leerRuta", () => {
  it("lee el algoritmo y los datos de la ejecución", () => {
    assert.deepEqual(leerRuta("#/a-estrella?grafo=mapa&origen=A&destino=L&h=manhattan"), {
      algoritmo: "a-estrella",
      grafo: "mapa",
      origen: "A",
      destino: "L",
      heuristica: "manhattan",
      semilla: null,
      nodos: null,
    });
  });

  it("lee la semilla y la cantidad de nodos de un grafo al azar", () => {
    const ruta = leerRuta("#/prim?grafo=azar&semilla=1234&nodos=9&origen=A");
    assert.equal(ruta.semilla, 1234);
    assert.equal(ruta.nodos, 9);
    assert.equal(leerRuta("#/prim?grafo=azar&semilla=0").semilla, 0);
  });

  it("deja en null lo que falta o no se entiende", () => {
    for (const hash of ["", "#", "#/", "#/bfs", "#/toString", undefined, null]) {
      assert.equal(leerRuta(hash).algoritmo, null, String(hash));
    }
    const ruta = leerRuta("#/kruskal?semilla=abc&nodos=-3");
    assert.equal(ruta.algoritmo, "kruskal");
    assert.equal(ruta.grafo, null);
    assert.equal(ruta.semilla, null);
    assert.equal(ruta.nodos, null);
  });

  it("acepta mayúsculas y una diagonal al final", () => {
    assert.equal(leerRuta("#/Dijkstra/").algoritmo, "dijkstra");
    assert.equal(leerRuta("#kruskal").algoritmo, "kruskal");
  });
});

describe("escribirRuta", () => {
  it("solo incluye lo que hace falta", () => {
    assert.equal(escribirRuta({ algoritmo: "kruskal", grafo: "clasico" }), "#/kruskal?grafo=clasico");
    assert.equal(escribirRuta({ algoritmo: "prim", grafo: null, origen: "A" }), "#/prim?origen=A");
    assert.equal(escribirRuta({ algoritmo: "kruskal", grafo: null }), "#/kruskal");
  });

  it("la semilla y los nodos solo van con un grafo al azar", () => {
    const datos = { algoritmo: "prim", origen: "A", semilla: 7, nodos: 9 };
    assert.equal(escribirRuta({ ...datos, grafo: "azar" }), "#/prim?grafo=azar&semilla=7&nodos=9&origen=A");
    assert.equal(escribirRuta({ ...datos, grafo: "mapa" }), "#/prim?grafo=mapa&origen=A");
  });

  it("lo que escribe se puede volver a leer", () => {
    const casos = [
      { algoritmo: "dijkstra", grafo: "mapa", origen: "A", destino: TODOS },
      { algoritmo: "a-estrella", grafo: "azar", semilla: 99, nodos: 12, origen: "B", destino: "L", heuristica: "cero" },
      { algoritmo: "prim", grafo: "islas", origen: "E" },
      { algoritmo: "kruskal", grafo: "cuadricula" },
    ];
    for (const caso of casos) {
      const leida = leerRuta(escribirRuta(caso));
      for (const [clave, valor] of Object.entries(caso)) assert.equal(leida[clave], valor, clave);
    }
  });
});
