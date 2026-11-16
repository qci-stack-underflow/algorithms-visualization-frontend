// Contenido de la guía «¿Cómo funciona?» de cada algoritmo: el cuadro con
// páginas que se abre desde la barra superior.
//
// Solo datos, sin nada del navegador; guia-dialogo.js los dibuja. Todas las
// guías usan el mismo grafo chico (GRAFO_GUIA) para poder comparar los
// cuatro algoritmos, y pruebas/grafos/guia.test.js ejecuta los algoritmos
// reales sobre él para comprobar cada número que aparece aquí.
//
// Cada página es { titulo, bloques }. Bloques:
//   { tipo: "p", texto }                  párrafo; **así** va en negritas
//   { tipo: "lista", items, numerada }    lista
//   { tipo: "formula", texto }            recuadro con una fórmula
//   { tipo: "nota", texto }               aclaración en un recuadro
//   { tipo: "tabla", columnas, filas }    tabla chica (filas: arreglos)
//   { tipo: "diagrama", pie, nodos, aristas, valores, papeles }
//       el grafo de la guía con estados: nodos { id: "cerrado" |
//       "frontera" | "ruta" | "apagado" }, aristas { id: "arbol" | "ruta" |
//       "candidata" | "descartada" }, valores { id: texto bajo el nodo },
//       papeles { id: "origen" | "destino" | … }
//   { tipo: "fila", bloques }             bloques lado a lado
import { crearGrafo } from "./grafo.js";

// Cinco nodos: E queda a la izquierda, lejos del destino D, para que se
// note la diferencia entre Dijkstra y A*. Coordenadas en un lienzo de 340×170.
export const GRAFO_GUIA = crearGrafo({
  nombre: "Grafo de la guía",
  nodos: [
    { id: "A", x: 110, y: 85 },
    { id: "B", x: 215, y: 35 },
    { id: "C", x: 200, y: 135 },
    { id: "D", x: 305, y: 85 },
    { id: "E", x: 30, y: 85 },
  ],
  aristas: [
    { a: "A", b: "B", peso: 5 },
    { a: "A", b: "C", peso: 1 },
    { a: "A", b: "E", peso: 2 },
    { a: "B", b: "C", peso: 3 },
    { a: "B", b: "D", peso: 1 },
    { a: "C", b: "D", peso: 5 },
  ],
});

export const ANCHO_GUIA = 340;
export const ALTO_GUIA = 170;

// Heurística de A* hacia D en el ejemplo (consistente: lo revisan las pruebas).
export const H_GUIA = Object.freeze({ A: 4, B: 1, C: 3, D: 0, E: 6 });

const RUTA = { "A-C": "ruta", "B-C": "ruta", "B-D": "ruta" };
const NODOS_RUTA = { A: "ruta", C: "ruta", B: "ruta", D: "ruta" };
const ARBOL = { "A-C": "arbol", "A-E": "arbol", "B-C": "arbol", "B-D": "arbol" };
const FUERA_DEL_ARBOL = { "A-B": "descartada", "C-D": "descartada" };
const PESOS = Object.fromEntries(GRAFO_GUIA.aristas.map(({ id }) => [id, "normal"]));

const dijkstra = {
  nombre: "Dijkstra",
  paginas: [
    {
      titulo: "La idea",
      bloques: [
        {
          tipo: "p",
          texto:
            "Dijkstra encuentra el camino **más barato** desde un nodo de origen hasta los demás, en un grafo cuyos pesos no son negativos: distancias, tiempos o costos.",
        },
        {
          tipo: "p",
          texto:
            "Funciona como una mancha de tinta que se extiende desde el origen: siempre avanza primero hacia el nodo **más cercano** que todavía no visitó. Cuando la tinta llega a un nodo, esa distancia ya es la menor posible.",
        },
        {
          tipo: "diagrama",
          aristas: PESOS,
          papeles: { A: "origen", D: "destino" },
          pie: "El grafo de esta guía. Se busca el camino más barato de A a D.",
        },
      ],
    },
    {
      titulo: "Lo que lleva en memoria",
      bloques: [
        {
          tipo: "lista",
          items: [
            "**dist[v]**: la menor distancia conocida desde el origen. Empieza en ∞, salvo el origen, que vale 0.",
            "**previo[v]**: desde qué nodo se llega a v por esa distancia. Sirve para reconstruir la ruta al final.",
            "**Cola de prioridad**: los nodos alcanzados que siguen abiertos, ordenados por dist. Sale primero el de menor dist.",
            "**Cerrados**: los nodos que ya salieron de la cola. Su distancia ya no cambia.",
          ],
        },
        {
          tipo: "formula",
          texto: "si dist[u] + peso(u, v) < dist[v]:\n    dist[v] = dist[u] + peso(u, v)\n    previo[v] = u",
        },
        {
          tipo: "nota",
          texto:
            "A esto se le llama **relajar** la arista u–v: probar si pasar por u es un atajo para llegar a v.",
        },
      ],
    },
    {
      titulo: "Paso a paso en el ejemplo",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Sale de la cola", "Revisa", "Cola después"],
          filas: [
            ["A (0)", "A–B: 0 + 5 = 5 · A–C: 0 + 1 = 1 · A–E: 0 + 2 = 2", "C 1 · E 2 · B 5"],
            ["C (1)", "C–B: 1 + 3 = **4**, mejora 5 · C–D: 1 + 5 = 6", "E 2 · B 4 · D 6"],
            ["E (2)", "No tiene vecinos abiertos", "B 4 · D 6"],
            ["B (4)", "B–D: 4 + 1 = **5**, mejora 6", "D 5"],
            ["D (5)", "Es el destino: termina", "—"],
          ],
        },
        {
          tipo: "diagrama",
          nodos: { ...NODOS_RUTA, E: "cerrado" },
          aristas: { ...PESOS, "A-E": "arbol", ...RUTA },
          valores: { A: "0", B: "4", C: "1", D: "5", E: "2" },
          papeles: { A: "origen", D: "destino" },
          pie: "Siguiendo previo desde D: D ← B ← C ← A. La ruta es A → C → B → D y cuesta 5.",
        },
      ],
    },
    {
      titulo: "Por qué funciona",
      bloques: [
        {
          tipo: "p",
          texto:
            "Cuando sale de la cola el nodo u con la menor distancia d, cualquier otra ruta hacia u tendría que pasar por algún nodo que sigue en la cola, y ese nodo ya está a d o más. Como los pesos **no restan**, esa ruta no puede costar menos de d.",
        },
        {
          tipo: "p",
          texto:
            "En el ejemplo, cuando B sale con 4, en la cola solo queda D con 6: llegar a B pasando por D costaría por lo menos 6.",
        },
        {
          tipo: "nota",
          texto:
            "Con pesos negativos deja de funcionar: un atajo negativo podría aparecer después de cerrar un nodo. Por ejemplo, en un grafo dirigido con A→B = 2, A→C = 3 y C→B = −2, Dijkstra cierra B con 2, pero A → C → B cuesta 1. Para esos grafos existe Bellman-Ford.",
        },
      ],
    },
    {
      titulo: "Costo y usos",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Operación", "Cuántas veces", "Costo con montículo"],
          filas: [
            ["Sacar el mínimo de la cola", "V (una por nodo)", "O(log V)"],
            ["Insertar o mejorar en la cola", "Hasta E (una por arista)", "O(log V)"],
            ["**Total**", "", "**O((V + E) log V)**"],
          ],
        },
        {
          tipo: "p",
          texto:
            "Con un arreglo en lugar del montículo cuesta O(V²), que conviene cuando el grafo es muy denso.",
        },
        {
          tipo: "lista",
          items: [
            "Mapas y GPS: la ruta más corta entre dos lugares (con variantes como A*).",
            "Redes: protocolos de enrutamiento como OSPF eligen el camino más barato para los paquetes.",
            "Juegos y logística: costos de moverse entre puntos.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "En esta pantalla, con **Destino: Todos los nodos** calcula la distancia a todos; con un destino se detiene en cuanto lo cierra.",
        },
      ],
    },
  ],
};

const aEstrella = {
  nombre: "A*",
  paginas: [
    {
      titulo: "La idea",
      bloques: [
        {
          tipo: "p",
          texto:
            "A* busca el camino más barato entre **un origen y un destino**. Es Dijkstra con brújula: además de lo que ya recorrió, **estima lo que falta** y avanza primero hacia donde parece estar el destino.",
        },
        {
          tipo: "p",
          texto:
            "Así deja sin revisar los nodos que quedan en dirección contraria. Con una buena estimación cierra muchos menos nodos que Dijkstra y llega a la misma ruta.",
        },
        {
          tipo: "diagrama",
          aristas: PESOS,
          valores: Object.fromEntries(Object.entries(H_GUIA).map(([id, h]) => [id, `h ${h}`])),
          papeles: { A: "origen", D: "destino" },
          pie: "Bajo cada nodo, h: lo que se estima que falta para llegar a D. E está del lado contrario, así que su h es la más grande.",
        },
      ],
    },
    {
      titulo: "f = g + h",
      bloques: [
        { tipo: "formula", texto: "f(v) = g(v) + h(v)" },
        {
          tipo: "lista",
          items: [
            "**g(v)**: lo recorrido de verdad desde el origen hasta v. Es el dist de Dijkstra.",
            "**h(v)**: la estimación de lo que falta de v al destino.",
            "**f(v)**: lo que promete costar la ruta completa si pasa por v.",
          ],
        },
        {
          tipo: "p",
          texto:
            "La cola se ordena por **f**, no por g. Un nodo cerca del origen pero en dirección contraria tiene g chica y h grande, así que espera su turno… y muchas veces nunca llega.",
        },
        {
          tipo: "nota",
          texto: "Con h = 0 para todos, f = g y A* hace exactamente lo mismo que Dijkstra.",
        },
      ],
    },
    {
      titulo: "La heurística",
      bloques: [
        {
          tipo: "p",
          texto:
            "Para que A* encuentre siempre la ruta más corta, h **no debe pasarse**: nunca estimar más de lo que de verdad falta (heurística admisible).",
        },
        {
          tipo: "p",
          texto:
            "Esta pantalla pide algo un poco más fuerte, que sea **consistente**: en cada arista, h(u) ≤ peso(u, v) + h(v). Con eso, un nodo que ya salió de la cola nunca se vuelve a abrir.",
        },
        {
          tipo: "lista",
          items: [
            "**Euclidiana**: la distancia en línea recta en el dibujo.",
            "**Manhattan**: |dx| + |dy|, la que se usa en cuadrículas.",
            "**Cero**: h = 0. A* se vuelve Dijkstra.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Las dos primeras se multiplican por una escala para pasarlas a las unidades de los pesos sin pasarse del costo real. Entre más se acerque h al costo real, menos nodos cierra A*.",
        },
      ],
    },
    {
      titulo: "Paso a paso en el ejemplo",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Sale (f = g + h)", "Revisa", "Cola después (f)"],
          filas: [
            ["A (0 + 4 = 4)", "B: g 5 · C: g 1 · E: g 2", "C 4 · B 6 · E 8"],
            ["C (1 + 3 = 4)", "B: 1 + 3 = **4**, mejora 5 · D: g 6", "B 5 · D 6 · E 8"],
            ["B (4 + 1 = 5)", "D: 4 + 1 = **5**, mejora 6", "D 5 · E 8"],
            ["D (5 + 0 = 5)", "Es el destino: termina", "E se queda sin cerrar"],
          ],
        },
        {
          tipo: "fila",
          bloques: [
            {
              tipo: "diagrama",
              nodos: { A: "cerrado", B: "cerrado", C: "cerrado", D: "cerrado", E: "cerrado" },
              aristas: { ...PESOS, "A-E": "arbol", ...RUTA },
              pie: "Dijkstra cierra los 5 nodos.",
            },
            {
              tipo: "diagrama",
              nodos: { A: "cerrado", B: "cerrado", C: "cerrado", D: "cerrado", E: "frontera" },
              aristas: { ...PESOS, "A-E": "candidata", ...RUTA },
              pie: "A* cierra 4: E nunca sale de la cola (f = 2 + 6 = 8).",
            },
          ],
        },
      ],
    },
    {
      titulo: "Costo y usos",
      bloques: [
        {
          tipo: "p",
          texto:
            "En el peor caso cuesta lo mismo que Dijkstra, **O((V + E) log V)**: con una h que no ayuda (como h = 0) revisa lo mismo. La mejora es práctica y depende de qué tan buena sea h.",
        },
        {
          tipo: "p",
          texto:
            "En el **mapa** de ejemplo de esta pantalla, A* cierra 7 nodos y Dijkstra 12 para llegar al mismo costo. El panel **Resultado** muestra esa comparación con cualquier grafo.",
        },
        {
          tipo: "lista",
          items: [
            "Videojuegos: mover personajes por un mapa esquivando obstáculos.",
            "GPS y robots: rutas cuando se conoce dónde está el destino.",
            "Rompecabezas como el 15-puzzle: h cuenta qué tan lejos está cada ficha de su lugar.",
          ],
        },
      ],
    },
  ],
};

const prim = {
  nombre: "Prim",
  paginas: [
    {
      titulo: "La idea",
      bloques: [
        {
          tipo: "p",
          texto:
            "Un **árbol de expansión mínima** es un grupo de aristas que une todos los nodos, sin ciclos, con el menor peso total. Por ejemplo: tender cable entre ciudades gastando lo menos posible.",
        },
        {
          tipo: "p",
          texto:
            "Prim hace crecer **un solo árbol** desde un nodo inicial. En cada paso le agrega la arista **más barata** que une el árbol con un nodo de afuera.",
        },
        {
          tipo: "diagrama",
          aristas: PESOS,
          papeles: { A: "inicio" },
          pie: "El grafo de esta guía, empezando el árbol en A.",
        },
      ],
    },
    {
      titulo: "Lo que lleva en memoria",
      bloques: [
        {
          tipo: "lista",
          items: [
            "**clave[v]**: el peso de la arista más barata conocida que une v con el árbol. Empieza en ∞, salvo el nodo inicial, que vale 0.",
            "**padre[v]**: el otro extremo de esa arista.",
            "**Cola de prioridad**: los nodos de afuera ya alcanzados, ordenados por clave.",
          ],
        },
        {
          tipo: "formula",
          texto: "si peso(u, v) < clave[v]:\n    clave[v] = peso(u, v)\n    padre[v] = u",
        },
        {
          tipo: "nota",
          texto:
            "Es casi el mismo código que Dijkstra. La diferencia: la clave es el peso de **una sola arista**, no la distancia acumulada desde el inicio. Por eso el árbol de Prim no da rutas más cortas.",
        },
      ],
    },
    {
      titulo: "Paso a paso en el ejemplo",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Entra al árbol", "Con la arista", "Claves después"],
          filas: [
            ["A", "Es el inicio", "C 1 · E 2 · B 5"],
            ["C", "A–C (1)", "E 2 · B **3** (C–B) · D 5"],
            ["E", "A–E (2)", "B 3 · D 5"],
            ["B", "C–B (3)", "D **1** (B–D)"],
            ["D", "B–D (1)", "—"],
          ],
        },
        {
          tipo: "diagrama",
          nodos: { A: "cerrado", B: "cerrado", C: "cerrado", D: "cerrado", E: "cerrado" },
          aristas: { ...ARBOL, ...FUERA_DEL_ARBOL },
          papeles: { A: "inicio" },
          pie: "Peso total: 1 + 2 + 3 + 1 = 7. A–B y C–D quedan fuera: siempre hubo una opción más barata.",
        },
      ],
    },
    {
      titulo: "Por qué funciona",
      bloques: [
        {
          tipo: "p",
          texto:
            "Se basa en la **propiedad del corte**: si se separan los nodos en dos grupos, la arista más barata que cruza de un grupo al otro siempre forma parte de algún árbol mínimo.",
        },
        {
          tipo: "p",
          texto:
            "Prim usa como grupos «el árbol» y «lo de afuera», y en cada paso toma justo esa arista. Por eso cada decisión es segura y nunca tiene que deshacer nada.",
        },
        {
          tipo: "nota",
          texto:
            "Si hay empates de peso puede haber varios árboles mínimos, todos con el mismo peso total. Si el grafo no es conexo, Prim solo cubre la parte del nodo inicial.",
        },
      ],
    },
    {
      titulo: "Costo y comparación",
      bloques: [
        {
          tipo: "p",
          texto:
            "Con montículo binario cuesta **O(E log V)**. Con una matriz de adyacencia y un arreglo cuesta O(V²), que conviene en grafos muy densos.",
        },
        {
          tipo: "tabla",
          columnas: ["", "Prim", "Kruskal"],
          filas: [
            ["Cómo crece", "Un solo árbol, nodo por nodo", "Varios pedazos que se van uniendo"],
            ["Necesita", "Un nodo inicial y una cola", "Ordenar las aristas y union-find"],
            ["Conviene en", "Grafos densos", "Grafos con pocas aristas"],
            ["Grafo no conexo", "Cubre una sola parte", "Da un bosque"],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Diseño de redes eléctricas, de agua o de telecomunicaciones.",
            "Agrupar datos parecidos (clustering).",
            "Primer paso de aproximaciones al problema del viajante.",
          ],
        },
      ],
    },
  ],
};

const kruskal = {
  nombre: "Kruskal",
  paginas: [
    {
      titulo: "La idea",
      bloques: [
        {
          tipo: "p",
          texto:
            "Kruskal también arma el **árbol de expansión mínima**, pero eligiendo aristas en lugar de nodos: las revisa de la **más barata a la más cara** y se queda con cada una que **no cierre un ciclo**.",
        },
        {
          tipo: "p",
          texto:
            "Al principio cada nodo está solo. Cada arista aceptada une dos pedazos, hasta que queda uno solo con todos los nodos.",
        },
        {
          tipo: "diagrama",
          aristas: PESOS,
          pie: "El grafo de esta guía. Aristas en orden: A–C 1, B–D 1, A–E 2, B–C 3, A–B 5, C–D 5.",
        },
      ],
    },
    {
      titulo: "Conjuntos disjuntos",
      bloques: [
        {
          tipo: "p",
          texto:
            "Para saber rápido si una arista cerraría un ciclo, Kruskal guarda en qué **grupo** está cada nodo con una estructura llamada *union-find*:",
        },
        {
          tipo: "lista",
          items: [
            "**encontrar(v)**: devuelve el representante del grupo de v.",
            "**unir(a, b)**: junta los grupos de a y b en uno.",
          ],
        },
        {
          tipo: "formula",
          texto: "si encontrar(a) ≠ encontrar(b):\n    agregar a–b al árbol\n    unir(a, b)\nsi no: a–b cerraría un ciclo",
        },
        {
          tipo: "nota",
          texto:
            "Con unión por tamaño (el grupo chico se cuelga del grande) y compresión de caminos, cada operación cuesta casi O(1).",
        },
      ],
    },
    {
      titulo: "Paso a paso en el ejemplo",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Arista", "¿Ya están unidos?", "Grupos después"],
          filas: [
            ["A–C (1)", "No: entra", "{A, C} {B} {D} {E}"],
            ["B–D (1)", "No: entra", "{A, C} {B, D} {E}"],
            ["A–E (2)", "No: entra", "{A, C, E} {B, D}"],
            ["B–C (3)", "No: entra", "{A, B, C, D, E}"],
          ],
        },
        {
          tipo: "diagrama",
          nodos: { A: "cerrado", B: "cerrado", C: "cerrado", D: "cerrado", E: "cerrado" },
          aristas: { ...ARBOL, ...FUERA_DEL_ARBOL },
          pie: "Con 4 aristas (nodos − 1) ya está completo y se detiene: A–B y C–D ni se revisan, cerrarían un ciclo. Peso total 7, igual que Prim.",
        },
      ],
    },
    {
      titulo: "Por qué funciona",
      bloques: [
        {
          tipo: "p",
          texto:
            "Una arista que cerraría un ciclo es la **más cara de ese ciclo**: las demás aristas del ciclo se revisaron antes. Quitar la más cara de un ciclo nunca empeora el árbol, así que se puede descartar sin miedo.",
        },
        {
          tipo: "p",
          texto:
            "Cada arista que acepta es la más barata que cruza entre su grupo y el resto, así que también cumple la **propiedad del corte**, igual que en Prim.",
        },
        {
          tipo: "nota",
          texto:
            "Si el grafo no es conexo, Kruskal no falla: termina con un **bosque**, un árbol mínimo por cada parte. Prueba el ejemplo de las islas.",
        },
      ],
    },
    {
      titulo: "Costo y usos",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Parte", "Costo"],
          filas: [
            ["Ordenar las aristas", "O(E log E)"],
            ["Una consulta de union-find por arista", "Casi O(1) cada una"],
            ["**Total**", "**O(E log E)**"],
          ],
        },
        {
          tipo: "p",
          texto:
            "Lo que más cuesta es ordenar. Si las aristas ya vienen ordenadas, Kruskal es prácticamente lineal.",
        },
        {
          tipo: "lista",
          items: [
            "Clustering: se arma el árbol y se quitan las aristas más caras para separar grupos.",
            "Diseño de redes y de circuitos.",
            "Segmentación de imágenes: unir píxeles parecidos en regiones.",
          ],
        },
      ],
    },
  ],
};

export const GUIAS = Object.freeze({ dijkstra, "a-estrella": aEstrella, prim, kruskal });
