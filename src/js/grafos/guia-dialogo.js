// Cuadro «¿Cómo funciona?»: explica el algoritmo actual en varias páginas,
// encima de la pantalla. Usa un <dialog> nativo, así que el foco, Escape y
// el fondo oscuro los maneja el navegador.
//
// Navegación: flechas a los lados, un círculo por página (el de la página
// actual es más grande) y las teclas ← y →.
import { ChevronLeft, ChevronRight, X, createElement } from "lucide";
import { ALTO_GUIA, ANCHO_GUIA, GRAFO_GUIA, GUIAS } from "./guia.js";

const SVG = "http://www.w3.org/2000/svg";
const RADIO = 17;

function crear(etiqueta, clase, padre) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  padre?.appendChild(elemento);
  return elemento;
}

function crearSvg(nombre, atributos, padre) {
  const elemento = document.createElementNS(SVG, nombre);
  for (const [clave, valor] of Object.entries(atributos)) elemento.setAttribute(clave, valor);
  padre.appendChild(elemento);
  return elemento;
}

// Texto con **negritas**, sin interpretar HTML.
function escribir(elemento, texto) {
  texto.split(/(\*\*[^*]+\*\*)/).forEach((parte) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      crear("strong", "", elemento).textContent = parte.slice(2, -2);
    } else if (parte) {
      elemento.append(parte);
    }
  });
  return elemento;
}

function dibujarDiagrama(bloque, padre) {
  const figura = crear("figure", "gr-guia-diagrama", padre);
  const svg = document.createElementNS(SVG, "svg");
  // Margen arriba y abajo para las etiquetas de origen/destino y los valores.
  svg.setAttribute("viewBox", `0 -14 ${ANCHO_GUIA} ${ALTO_GUIA + 30}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", bloque.pie ?? "Grafo de ejemplo");
  figura.append(svg);

  const posicion = new Map(GRAFO_GUIA.nodos.map((nodo) => [nodo.id, nodo]));
  const capaPesos = [];
  for (const { id, a, b, peso } of GRAFO_GUIA.aristas) {
    const [p, q] = [posicion.get(a), posicion.get(b)];
    const estado = bloque.aristas?.[id] ?? "normal";
    crearSvg("line", { class: "gr-guia-arista", "data-estado": estado, x1: p.x, y1: p.y, x2: q.x, y2: q.y }, svg);
    capaPesos.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, peso, estado });
  }
  for (const { x, y, peso, estado } of capaPesos) {
    const grupo = crearSvg("g", { class: "gr-guia-peso", "data-estado": estado, transform: `translate(${x} ${y})` }, svg);
    crearSvg("rect", { x: -10, y: -9, width: 20, height: 18, rx: 5 }, grupo);
    crearSvg("text", {}, grupo).textContent = peso;
  }
  for (const { id, x, y } of GRAFO_GUIA.nodos) {
    const grupo = crearSvg(
      "g",
      { class: "gr-guia-nodo", "data-estado": bloque.nodos?.[id] ?? "nuevo", transform: `translate(${x} ${y})` },
      svg
    );
    crearSvg("circle", { r: RADIO }, grupo);
    crearSvg("text", {}, grupo).textContent = id;

    const valor = bloque.valores?.[id];
    if (valor) {
      const ancho = valor.length * 7 + 12;
      // Los nodos de arriba llevan el valor encima: abajo chocaría con sus aristas.
      const arriba = y < ALTO_GUIA / 3 && !bloque.papeles?.[id];
      const etiqueta = crearSvg(
        "g",
        { class: "gr-guia-valor", transform: `translate(0 ${arriba ? -RADIO - 13 : RADIO + 13})` },
        grupo
      );
      crearSvg("rect", { x: -ancho / 2, y: -9, width: ancho, height: 18, rx: 5 }, etiqueta);
      crearSvg("text", {}, etiqueta).textContent = valor;
    }
    const papel = bloque.papeles?.[id];
    if (papel) {
      const ancho = papel.length * 6.4 + 14;
      const etiqueta = crearSvg("g", { class: "gr-guia-papel", transform: `translate(0 ${-RADIO - 12})` }, grupo);
      crearSvg("rect", { x: -ancho / 2, y: -8, width: ancho, height: 16, rx: 8 }, etiqueta);
      crearSvg("text", {}, etiqueta).textContent = papel;
    }
  }

  if (bloque.pie) escribir(crear("figcaption", "", figura), bloque.pie);
}

function dibujarBloque(bloque, padre) {
  switch (bloque.tipo) {
    case "p":
      escribir(crear("p", "gr-guia-parrafo", padre), bloque.texto);
      break;
    case "lista": {
      const lista = crear(bloque.numerada ? "ol" : "ul", "gr-guia-lista", padre);
      for (const item of bloque.items) escribir(crear("li", "", lista), item);
      break;
    }
    case "formula":
      crear("pre", "gr-guia-formula", padre).textContent = bloque.texto;
      break;
    case "nota":
      escribir(crear("p", "gr-guia-nota", padre), bloque.texto);
      break;
    case "tabla": {
      const marco = crear("div", "gr-guia-tabla", padre);
      const tabla = crear("table", "", marco);
      const encabezado = crear("tr", "", crear("thead", "", tabla));
      for (const columna of bloque.columnas) escribir(crear("th", "", encabezado), columna);
      const cuerpo = crear("tbody", "", tabla);
      for (const fila of bloque.filas) {
        const renglon = crear("tr", "", cuerpo);
        for (const celda of fila) escribir(crear("td", "", renglon), celda);
      }
      break;
    }
    case "diagrama":
      dibujarDiagrama(bloque, padre);
      break;
    case "fila": {
      const fila = crear("div", "gr-guia-fila", padre);
      for (const interno of bloque.bloques) dibujarBloque(interno, fila);
      break;
    }
    default:
      break;
  }
}

// dialogo  el <dialog data-guia> de la página
export function crearGuia(dialogo) {
  const titulo = dialogo.querySelector("[data-guia-titulo]");
  const subtitulo = dialogo.querySelector("[data-guia-subtitulo]");
  const cuerpo = dialogo.querySelector("[data-guia-cuerpo]");
  const puntos = dialogo.querySelector("[data-guia-puntos]");
  const cuenta = dialogo.querySelector("[data-guia-cuenta]");
  const anterior = dialogo.querySelector("[data-guia-anterior]");
  const siguiente = dialogo.querySelector("[data-guia-siguiente]");
  const cerrar = dialogo.querySelector("[data-guia-cerrar]");

  anterior.append(createElement(ChevronLeft));
  siguiente.append(createElement(ChevronRight));
  cerrar.append(createElement(X));

  let guia = null;
  let algoritmo = null;
  let pagina = 0;

  function mostrarPagina(nueva, { direccion = 0 } = {}) {
    pagina = Math.max(0, Math.min(guia.paginas.length - 1, nueva));
    const { titulo: tituloPagina, bloques } = guia.paginas[pagina];

    subtitulo.textContent = `¿Cómo funciona ${guia.nombre}? · ${pagina + 1} de ${guia.paginas.length}`;
    titulo.textContent = tituloPagina;
    const contenido = crear("div", "gr-guia-pagina");
    if (direccion) contenido.dataset.entrada = direccion > 0 ? "derecha" : "izquierda";
    for (const bloque of bloques) dibujarBloque(bloque, contenido);
    cuerpo.replaceChildren(contenido);
    cuerpo.scrollTop = 0;

    [...puntos.children].forEach((punto, i) => {
      const actual = i === pagina;
      punto.classList.toggle("is-actual", actual);
      if (actual) punto.setAttribute("aria-current", "step");
      else punto.removeAttribute("aria-current");
    });
    cuenta.textContent = `Página ${pagina + 1} de ${guia.paginas.length}: ${tituloPagina}`;
    // Si el foco estaba en una flecha que se deshabilita (primera o última
    // página), pasa a la otra para no salirse del cuadro.
    const conFoco = document.activeElement;
    anterior.disabled = pagina === 0;
    siguiente.disabled = pagina === guia.paginas.length - 1;
    if (dialogo.open && conFoco?.disabled) (conFoco === siguiente ? anterior : siguiente).focus();
  }

  function cargar(id) {
    guia = GUIAS[id];
    algoritmo = id;
    puntos.replaceChildren(
      ...guia.paginas.map(({ titulo: tituloPagina }, i) => {
        const punto = crear("button", "gr-guia-punto");
        punto.type = "button";
        punto.setAttribute("aria-label", `Página ${i + 1}: ${tituloPagina}`);
        punto.addEventListener("click", () => mover(i));
        return punto;
      })
    );
    mostrarPagina(0);
  }

  function mover(destino) {
    if (destino === pagina || destino < 0 || destino >= guia.paginas.length) return;
    mostrarPagina(destino, { direccion: destino - pagina });
  }

  anterior.addEventListener("click", () => mover(pagina - 1));
  siguiente.addEventListener("click", () => mover(pagina + 1));
  cerrar.addEventListener("click", () => dialogo.close());

  // Un clic en el fondo oscuro (fuera del cuadro) también cierra.
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  // Con la guía abierta, ← y → cambian de página y Escape la cierra. Se
  // atrapan antes que nadie (fase de captura) para que el reproductor de la
  // pantalla, que también escucha ← → y Espacio, no se mueva detrás.
  document.addEventListener(
    "keydown",
    (evento) => {
      if (!dialogo.open || evento.altKey || evento.ctrlKey || evento.metaKey) return;
      const paso = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
      if (paso) {
        evento.preventDefault();
        mover(pagina + paso);
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        dialogo.close();
      } else if (evento.key === " " && !evento.target.closest?.("button")) {
        evento.preventDefault(); // que Espacio no reproduzca detrás
      } else {
        return;
      }
      evento.stopPropagation();
    },
    { capture: true }
  );

  return {
    // Abre la guía del algoritmo. Si es el mismo de la última vez, sigue en
    // la página donde se quedó.
    abrir(id) {
      if (!Object.hasOwn(GUIAS, id)) return;
      if (id !== algoritmo) cargar(id);
      dialogo.showModal();
      siguiente.disabled ? cerrar.focus() : siguiente.focus();
    },
    get abierta() {
      return dialogo.open;
    },
  };
}
