// Pantalla de grafos: une los controles, el dibujo, el reproductor, el
// pseudocódigo y las tablas. Los algoritmos están en los demás archivos de
// esta carpeta y no saben nada de la página.
//
// Flujo: cada cambio (algoritmo, grafo, origen, destino o heurística) pasa
// por `actualizar()`, que vuelve a ejecutar el algoritmo y deja el
// reproductor en el paso inicial. El reproductor llama a `mostrarPaso()`
// cada vez que cambia de paso.
import { ALGORITMOS, ejecutar } from "./algoritmos.js";
import { describirPaso, formatoNumero } from "./descripciones.js";
import { EJEMPLOS, ejemploPorId } from "./ejemplos.js";
import { MAX_NODOS, MIN_NODOS, grafoAleatorio } from "./generador.js";
import { ErrorDeGrafo, tieneNodo } from "./grafo.js";
import { HEURISTICAS } from "./heuristica.js";
import { crearLienzo } from "./lienzo.js";
import { crearReproductor } from "./reproductor.js";
import { pintarResultado } from "./resultado.js";
import { ALGORITMO_INICIAL, TODOS, escribirRuta, leerRuta } from "./ruta.js";
import { pintarEstado } from "./tablas.js";
import { grafoATexto, leerGrafo } from "./texto.js";

const NODOS_AL_AZAR = 9;

// Color de la muestra junto a la descripción del paso.
const MUESTRA_POR_TIPO = {
  inicio: "gr-paso--neutro",
  extraer: "gr-paso--cerrado",
  relajar: "gr-paso--frontera",
  mantener: "gr-paso--foco",
  aceptar: "gr-paso--cerrado",
  rechazar: "gr-paso--rechazo",
  fin: "gr-paso--cerrado",
};

// Qué valor se escribe bajo cada nodo y cómo se explica.
const VALOR_POR_NODO = {
  dijkstra: { campo: "dist", nombre: "distancia" },
  "a-estrella": { campo: "f", nombre: "f" },
  prim: { campo: "clave", nombre: "clave" },
};

const ESTADO_EN_PALABRAS = { nuevo: "sin visitar", frontera: "en la cola", cerrado: "cerrado" };

export function iniciarPantalla() {
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    pestanas: [...document.querySelectorAll("[data-pestanas] [data-algoritmo]")],
    area: $("[data-area]"),
    resumen: $("[data-resumen]"),
    complejidad: $("[data-complejidad]"),
    grafo: $("[data-grafo]"),
    origen: $("[data-origen]"),
    destino: $("[data-destino]"),
    heuristica: $("[data-heuristica]"),
    campoOrigen: $("[data-campo-origen]"),
    campoDestino: $("[data-campo-destino]"),
    campoHeuristica: $("[data-campo-heuristica]"),
    etiquetaOrigen: $("[data-etiqueta-origen]"),
    azar: $("[data-azar]"),
    azarNodos: $("[data-azar-nodos]"),
    nota: $("[data-nota]"),
    cuenta: $("[data-cuenta]"),
    clic: $("[data-clic]"),
    modosDeClic: [...document.querySelectorAll("[data-clic-modo]")],
    valorNota: $("[data-valor-nota]"),
    leyendaCerrado: $("[data-leyenda-cerrado]"),
    leyendaArbol: $("[data-leyenda-arbol]"),
    codigoTitulo: $("[data-codigo-titulo]"),
    codigoContador: $("[data-codigo-contador]"),
    codigoLineas: $("[data-codigo-lineas]"),
    codigoPaso: $("[data-codigo-paso]"),
    codigoMuestra: $("[data-codigo-muestra]"),
    codigoTexto: $("[data-codigo-texto]"),
    pieMuestra: $("[data-pie-muestra]"),
    pieTexto: $("[data-pie-texto]"),
    estado: $("[data-estado]"),
    estadoCuenta: $("[data-estado-cuenta]"),
    resultado: {
      parrafo: $("[data-resultado]"),
      tabla: $("[data-comparacion]"),
      nota: $("[data-comparacion-nota]"),
    },
    propio: $("[data-propio]"),
    propioForma: $("[data-propio-forma]"),
    propioTexto: $("[data-propio-texto]"),
    propioError: $("[data-propio-error]"),
  };
  if (!ui.area) return;

  const estado = {
    algoritmo: ALGORITMO_INICIAL,
    grafoId: null, // id de un ejemplo, "azar" o "propio"
    grafo: null,
    semilla: null, // solo con grafoId = "azar"
    origen: null,
    destino: null, // null = sin destino (Dijkstra hacia todos los nodos)
    heuristica: "euclidiana",
    modoDeClic: "origen",
    ejecucion: null,
  };

  const algoritmoActual = () => ALGORITMOS[estado.algoritmo];
  const ids = () => estado.grafo.nodos.map(({ id }) => id);

  const lienzo = crearLienzo($("[data-lienzo]"), { alElegirNodo: elegirNodo });
  const reproductor = crearReproductor($("[data-reproductor]"), { alMostrar: mostrarPaso });

  /* Cargar un grafo */

  function usarGrafo(id, grafo, { origen, destino, semilla = null }) {
    estado.grafoId = id;
    estado.grafo = grafo;
    estado.semilla = semilla;
    estado.origen = origen;
    estado.destino = destino;
    lienzo.dibujar(grafo);
    ui.propioTexto.value = grafoATexto(grafo);
    ui.propioError.hidden = true;
  }

  function usarEjemplo(id) {
    const ejemplo = ejemploPorId(id) ?? EJEMPLOS[0];
    usarGrafo(ejemplo.id, ejemplo.grafo, ejemplo);
  }

  function usarGrafoAlAzar({ nodos, semilla } = {}) {
    const cantidad = Math.max(
      MIN_NODOS,
      Math.min(MAX_NODOS, Math.trunc(nodos ?? Number(ui.azarNodos.value)) || NODOS_AL_AZAR)
    );
    ui.azarNodos.value = cantidad;
    const semillaUsada = semilla ?? Math.floor(Math.random() * 1_000_000);
    const grafo = grafoAleatorio({ nodos: cantidad, semilla: semillaUsada });
    // Los nodos van de izquierda a derecha: del primero al último es el
    // recorrido más largo.
    usarGrafo("azar", grafo, {
      origen: grafo.nodos[0].id,
      destino: grafo.nodos.at(-1).id,
      semilla: semillaUsada,
    });
  }

  /* Recalcular y volver a pintar todo */

  // Deja origen y destino en valores que el grafo y el algoritmo aceptan.
  function ajustarSeleccion() {
    const nodos = ids();
    if (!tieneNodo(estado.grafo, estado.origen)) estado.origen = nodos[0];
    if (estado.destino !== null && !tieneNodo(estado.grafo, estado.destino)) estado.destino = null;
    if (algoritmoActual().destino === "obligatorio" && estado.destino === null) {
      const ejemplo = ejemploPorId(estado.grafoId);
      estado.destino = ejemplo?.destino ?? nodos.findLast((id) => id !== estado.origen) ?? nodos[0];
    }
    if (algoritmoActual().destino === "no") estado.modoDeClic = "origen";
  }

  function llenarSelect(select, opciones, valor) {
    select.replaceChildren(
      ...opciones.map(([id, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = id;
        opcion.textContent = texto;
        return opcion;
      })
    );
    select.value = valor;
  }

  function pintarControles() {
    const algoritmo = algoritmoActual();
    const nodos = ids().map((id) => [id, id]);

    for (const pestana of ui.pestanas) {
      const activa = pestana.dataset.algoritmo === estado.algoritmo;
      pestana.setAttribute("aria-selected", String(activa));
      pestana.tabIndex = activa ? 0 : -1;
    }
    ui.area.setAttribute("aria-labelledby", `pestana-${estado.algoritmo}`);
    ui.resumen.textContent = algoritmo.resumen;
    ui.complejidad.textContent = algoritmo.complejidad;
    document.title = `${algoritmo.nombre} · Grafos · StackUnderFlow`;

    const grafos = EJEMPLOS.map(({ id, nombre }) => [id, nombre]);
    grafos.push(["azar", estado.grafoId === "azar" ? estado.grafo.nombre : "Aleatorio"]);
    if (estado.grafoId === "propio") grafos.push(["propio", "Grafo propio"]);
    llenarSelect(ui.grafo, grafos, estado.grafoId);

    ui.campoOrigen.hidden = !algoritmo.origen;
    ui.etiquetaOrigen.textContent = estado.algoritmo === "prim" ? "Nodo inicial" : "Origen";
    llenarSelect(ui.origen, nodos, estado.origen);

    ui.campoDestino.hidden = algoritmo.destino === "no";
    llenarSelect(
      ui.destino,
      algoritmo.destino === "opcional" ? [["", "Todos los nodos"], ...nodos] : nodos,
      estado.destino ?? ""
    );

    ui.campoHeuristica.hidden = !algoritmo.heuristica;
    llenarSelect(
      ui.heuristica,
      Object.entries(HEURISTICAS).map(([id, { nombre }]) => [id, nombre]),
      estado.heuristica
    );

    ui.nota.textContent =
      estado.grafoId === "azar"
        ? "Grafo generado al azar: cada peso es el largo de la arista, alargado hasta un 50 % como una carretera con curvas."
        : estado.grafoId === "propio"
          ? "Grafo escrito a mano. Se puede seguir editando al final de la página."
          : ejemploPorId(estado.grafoId).nota;
    const { nodos: listaNodos, aristas } = estado.grafo;
    ui.cuenta.textContent = `${listaNodos.length} nodos · ${aristas.length} aristas`;

    // Clic en un nodo: elige origen o destino en los caminos, el nodo
    // inicial en Prim y nada en Kruskal.
    ui.clic.hidden = algoritmo.destino === "no";
    for (const boton of ui.modosDeClic) {
      const activo = boton.dataset.clicModo === estado.modoDeClic;
      boton.classList.toggle("is-activa", activo);
      boton.setAttribute("aria-checked", String(activo));
    }
    lienzo.permitirElegir(algoritmo.origen);

    // Leyenda: solo las entradas que usa este algoritmo.
    const esCamino = algoritmo.familia === "caminos";
    const visibles = { cola: estado.algoritmo !== "kruskal", ruta: esCamino, arbol: !esCamino };
    for (const entrada of document.querySelectorAll("[data-leyenda]")) {
      entrada.hidden = !visibles[entrada.dataset.leyenda];
    }
    ui.leyendaCerrado.textContent = esCamino ? "Cerrado: su valor ya es definitivo" : "Nodo en el árbol";
    ui.leyendaArbol.textContent = esCamino ? "Por aquí se llega al nodo" : "Arista en el árbol";
    ui.valorNota.textContent = notaDelValor();

    ui.codigoTitulo.textContent = `Pseudocódigo · ${algoritmo.nombre}`;
    ui.codigoLineas.replaceChildren(
      ...algoritmo.pseudocodigo.map((linea) => {
        const item = document.createElement("li");
        item.textContent = linea;
        return item;
      })
    );
  }

  function notaDelValor() {
    const { origen, destino } = estado;
    if (estado.algoritmo === "dijkstra") {
      return `El número bajo cada nodo es dist: la menor distancia conocida desde ${origen}.`;
    }
    if (estado.algoritmo === "prim") {
      return "El número bajo cada nodo es su clave: el peso de la arista más barata que lo une al árbol.";
    }
    if (estado.algoritmo !== "a-estrella") return "";

    const { heuristica } = estado.ejecucion.resultado;
    if (heuristica.tipo === "cero") {
      return "El número bajo cada nodo es f = g + h. Con h = 0, f es lo recorrido y A* hace lo mismo que Dijkstra.";
    }
    if (heuristica.escala === 0) {
      return "El número bajo cada nodo es f = g + h. En este grafo h vale 0: hay una arista que no cuesta nada, así que la distancia en el dibujo no sirve para estimar.";
    }
    const medida = heuristica.tipo === "manhattan" ? "Manhattan" : "en línea recta";
    return `El número bajo cada nodo es f = g + h. h es la distancia ${medida} hasta ${destino} en el dibujo, por ${Number(heuristica.escala.toPrecision(3))} para dejarla en las unidades de los pesos sin pasarse del costo real.`;
  }

  function actualizar() {
    ajustarSeleccion();
    const { origen, destino, heuristica } = estado;
    estado.ejecucion = ejecutar(estado.algoritmo, estado.grafo, { origen, destino, heuristica });

    pintarControles();
    pintarResultado(ui.resultado, {
      algoritmo: estado.algoritmo,
      grafo: estado.grafo,
      opciones: { origen, destino, heuristica },
      ejecucion: estado.ejecucion,
    });
    reproductor.cargar(estado.ejecucion.pasos.length); // muestra el paso 0
    guardarRuta();
  }

  /* Un paso en pantalla */

  function mostrarPaso(indice, { reproduciendo }) {
    const { pasos } = estado.ejecucion;
    const paso = pasos[indice];
    const valor = VALOR_POR_NODO[estado.algoritmo];
    const camino = algoritmoActual().familia === "caminos";

    const papeles = {};
    if (estado.algoritmo === "prim") papeles[estado.origen] = "inicio";
    if (camino) {
      papeles[estado.origen] = "origen";
      if (estado.destino !== null) {
        papeles[estado.destino] = estado.destino === estado.origen ? "origen y destino" : "destino";
      }
    }

    lienzo.pintar(paso, {
      papeles,
      valores:
        valor && Object.fromEntries(ids().map((id) => [id, formatoNumero(paso[valor.campo][id])])),
      describir: (id) => {
        const partes = [`Nodo ${id}`];
        if (papeles[id]) partes.push(papeles[id]);
        partes.push(ESTADO_EN_PALABRAS[paso.nodos[id]]);
        if (valor) partes.push(`${valor.nombre} ${formatoNumero(paso[valor.campo][id])}`);
        return partes.join(", ");
      },
    });

    ui.codigoLineas.querySelector(".is-active")?.classList.remove("is-active");
    ui.codigoLineas.children[paso.linea]?.classList.add("is-active");
    ui.codigoContador.textContent = `${indice} / ${pasos.length - 1}`;
    const descripcion = describirPaso(estado.algoritmo, paso);
    for (const [muestra, texto] of [
      [ui.codigoMuestra, ui.codigoTexto],
      [ui.pieMuestra, ui.pieTexto],
    ]) {
      muestra.className = `swatch ${MUESTRA_POR_TIPO[paso.tipo] ?? ""}`;
      texto.textContent = descripcion;
    }
    // Mientras se reproduce no se anuncia cada paso a los lectores de pantalla.
    ui.codigoPaso.setAttribute("aria-live", reproduciendo ? "off" : "polite");

    pintarEstado(ui.estado, ui.estadoCuenta, {
      algoritmo: estado.algoritmo,
      grafo: estado.grafo,
      paso,
    });
  }

  /* Dirección de la página */

  function guardarRuta() {
    const algoritmo = algoritmoActual();
    const ruta = escribirRuta({
      algoritmo: estado.algoritmo,
      // Un grafo escrito a mano no cabe en la dirección.
      grafo: estado.grafoId === "propio" ? null : estado.grafoId,
      semilla: estado.semilla,
      nodos: estado.grafo.nodos.length,
      origen: algoritmo.origen ? estado.origen : null,
      destino: algoritmo.destino === "no" ? null : (estado.destino ?? TODOS),
      heuristica: algoritmo.heuristica ? estado.heuristica : null,
    });
    if (ruta !== location.hash) history.replaceState(null, "", ruta);
  }

  function aplicarRuta() {
    const ruta = leerRuta(location.hash);
    if (ruta.algoritmo) estado.algoritmo = ruta.algoritmo;
    if (Object.hasOwn(HEURISTICAS, ruta.heuristica ?? "")) estado.heuristica = ruta.heuristica;

    if (ruta.grafo === "azar") {
      const mismo = estado.grafoId === "azar" && estado.semilla === ruta.semilla;
      if (!mismo) usarGrafoAlAzar({ nodos: ruta.nodos ?? undefined, semilla: ruta.semilla ?? undefined });
    } else if (ejemploPorId(ruta.grafo)) {
      if (estado.grafoId !== ruta.grafo) usarEjemplo(ruta.grafo);
    } else if (!estado.grafo) {
      usarEjemplo(EJEMPLOS[0].id);
    }

    if (ruta.origen !== null && tieneNodo(estado.grafo, ruta.origen)) estado.origen = ruta.origen;
    if (ruta.destino === TODOS) estado.destino = null;
    else if (ruta.destino !== null && tieneNodo(estado.grafo, ruta.destino)) {
      estado.destino = ruta.destino;
    }
    actualizar();
  }

  /* Eventos */

  function elegirAlgoritmo(id, { enfocar = false } = {}) {
    if (!Object.hasOwn(ALGORITMOS, id) || id === estado.algoritmo) return;
    estado.algoritmo = id;
    actualizar();
    if (enfocar) ui.pestanas.find((pestana) => pestana.dataset.algoritmo === id)?.focus();
  }

  function elegirNodo(id) {
    const algoritmo = algoritmoActual();
    if (!algoritmo.origen) return;
    if (estado.modoDeClic === "destino" && algoritmo.destino !== "no") estado.destino = id;
    else estado.origen = id;
    actualizar();
    // El dibujo no se rehace, así que el nodo conserva el foco del teclado.
  }

  ui.pestanas.forEach((pestana, i) => {
    pestana.addEventListener("click", () => elegirAlgoritmo(pestana.dataset.algoritmo));
    // Flechas para moverse entre pestañas, como en cualquier grupo de pestañas.
    pestana.addEventListener("keydown", (evento) => {
      const paso = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
      const destino =
        evento.key === "Home"
          ? 0
          : evento.key === "End"
            ? ui.pestanas.length - 1
            : paso
              ? (i + paso + ui.pestanas.length) % ui.pestanas.length
              : null;
      if (destino === null) return;
      evento.preventDefault();
      evento.stopPropagation(); // que el reproductor no lo tome como "paso siguiente"
      elegirAlgoritmo(ui.pestanas[destino].dataset.algoritmo, { enfocar: true });
    });
  });

  ui.grafo.addEventListener("change", () => {
    if (ui.grafo.value === "azar") usarGrafoAlAzar();
    else if (ui.grafo.value !== "propio") usarEjemplo(ui.grafo.value);
    actualizar();
  });
  ui.origen.addEventListener("change", () => {
    estado.origen = ui.origen.value;
    actualizar();
  });
  ui.destino.addEventListener("change", () => {
    estado.destino = ui.destino.value || null;
    actualizar();
  });
  ui.heuristica.addEventListener("change", () => {
    estado.heuristica = ui.heuristica.value;
    actualizar();
  });
  ui.azar.addEventListener("click", () => {
    usarGrafoAlAzar();
    actualizar();
  });
  // Enter en "Nodos" genera el grafo en lugar de enviar el formulario.
  $("[data-opciones]").addEventListener("submit", (evento) => {
    evento.preventDefault();
    usarGrafoAlAzar();
    actualizar();
  });

  ui.modosDeClic.forEach((boton) =>
    boton.addEventListener("click", () => {
      estado.modoDeClic = boton.dataset.clicModo;
      pintarControles();
      mostrarPaso(reproductor.indice, { reproduciendo: false });
    })
  );

  ui.propioForma.addEventListener("submit", (evento) => {
    evento.preventDefault();
    try {
      // Las posiciones del grafo actual se conservan si no hay nodos nuevos.
      const grafo = leerGrafo(ui.propioTexto.value, estado.grafo);
      const texto = ui.propioTexto.value;
      usarGrafo("propio", grafo, { origen: estado.origen, destino: estado.destino });
      ui.propioTexto.value = texto; // tal como se escribió
      actualizar();
      $("[data-lienzo-marco]").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      if (!(error instanceof ErrorDeGrafo)) throw error;
      ui.propioError.textContent = error.message;
      ui.propioError.hidden = false;
    }
  });

  window.addEventListener("hashchange", aplicarRuta);
  aplicarRuta();
}
