// Globo de "¿por qué?" sobre el dibujo del grafo.
//
// Muestra lo que arma explicaciones.js. Se coloca en el hueco del dibujo
// que tape menos (sobre todo, que no tape la ruta ni los nodos de los que
// habla) y una línea guía lo une con el nodo o la arista del paso. Si el
// dibujo se ve muy chico (teléfonos) el globo no flota: va debajo.
import { Lightbulb, createElement } from "lucide";
import { formatoNumero } from "./descripciones.js";

// Por debajo de este ancho (px) el globo taparía demasiado del dibujo.
const ANCHO_MINIMO_FLOTANTE = 620;
const BORDE = 6; // espacio mínimo con el borde del dibujo (px)
const SEPARACION = 10; // espacio mínimo entre el globo y lo que señala (px)
const REJILLA = 18; // cada cuántos px se prueba un lugar

// Cuánto cuesta tapar cada cosa, por px² tapado.
const COSTO = {
  nodoFoco: 14, // los nodos de los que habla el globo
  nodoRuta: 8, // los nodos de la ruta propuesta
  nodo: 2.5,
  valorFoco: 6,
  valor: 1,
  pesoFoco: 14,
  pesoRuta: 5,
  peso: 0.5,
  lineaRuta: 6, // un tramo de la ruta propuesta
  linea: 0.15,
};
const COSTO_POR_PX_DE_DISTANCIA = 10; // alejarse del punto
const COSTO_POR_PX_DE_SALTO = 6; // moverse respecto al paso anterior
const CADA_CUANTO_MUESTREAR = 22; // unidades del dibujo entre muestras de una arista
const LADO_MUESTRA = 16;

const area = (p, q) =>
  Math.max(0, Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1)) *
  Math.max(0, Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1));

const caja = (x, y, ancho, alto, costo) => ({
  x1: x - ancho / 2,
  x2: x + ancho / 2,
  y1: y - alto / 2,
  y2: y + alto / 2,
  costo,
});

// Punto del rectángulo más cercano a p.
const masCercano = (rect, p) => ({
  x: Math.min(Math.max(p.x, rect.x1), rect.x2),
  y: Math.min(Math.max(p.y, rect.y1), rect.y2),
});

function crearElemento(etiqueta, clase, padre) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  padre?.appendChild(elemento);
  return elemento;
}

// Lo que no conviene tapar, en unidades del dibujo y con su costo.
function estorbosDe(dibujo, explicacion) {
  const { ancla, propuesta } = explicacion;
  const foco = new Set(ancla.tipo === "nodo" ? [ancla.id] : [ancla.desde, ancla.hacia]);
  const tramos = new Set((propuesta?.tramos ?? []).map(({ arista }) => arista));
  const enRuta = new Set((propuesta?.tramos ?? []).flatMap(({ desde, hacia }) => [desde, hacia]));
  const lado = 2 * dibujo.radio + 10;
  const estorbos = [];

  for (const nodo of dibujo.nodos) {
    const esFoco = foco.has(nodo.id);
    const costo = esFoco ? COSTO.nodoFoco : enRuta.has(nodo.id) ? COSTO.nodoRuta : COSTO.nodo;
    estorbos.push(caja(nodo.x, nodo.y, lado, lado, costo));
    const { x, y, ancho } = nodo.valor;
    estorbos.push(caja(x, y, ancho, dibujo.altoEtiqueta, esFoco ? COSTO.valorFoco : COSTO.valor));
  }
  for (const arista of dibujo.aristas) {
    const esFoco = ancla.tipo === "arista" && arista.id === ancla.id;
    const esRuta = esFoco || tramos.has(arista.id);
    const { x, y, ancho } = arista.peso;
    const costoPeso = esFoco ? COSTO.pesoFoco : esRuta ? COSTO.pesoRuta : COSTO.peso;
    estorbos.push(caja(x, y, ancho, dibujo.altoEtiqueta, costoPeso));

    // La línea se reparte en cuadritos.
    const largo = Math.hypot(arista.x2 - arista.x1, arista.y2 - arista.y1);
    const muestras = Math.max(1, Math.round(largo / CADA_CUANTO_MUESTREAR));
    for (let i = 1; i < muestras; i++) {
      const t = i / muestras;
      estorbos.push(
        caja(
          arista.x1 + (arista.x2 - arista.x1) * t,
          arista.y1 + (arista.y2 - arista.y1) * t,
          LADO_MUESTRA,
          LADO_MUESTRA,
          esRuta ? COSTO.lineaRuta : COSTO.linea
        )
      );
    }
  }
  return estorbos;
}

// contenido  elemento con position: relative que envuelve al SVG
// svg        el dibujo, para medirlo
// abajo      contenedor bajo el dibujo para el modo sin flotar
// geometria  () → lienzo.geometria()
export function crearGlobo({ contenido, svg, abajo, geometria }) {
  const guia = crearElemento("span", "gr-globo-guia", contenido);
  guia.setAttribute("aria-hidden", "true");
  guia.hidden = true;

  const globo = crearElemento("div", "gr-globo");
  globo.setAttribute("role", "note");
  globo.hidden = true;

  const cabeza = crearElemento("div", "gr-globo-cabeza", globo);
  const icono = crearElemento("span", "gr-globo-icono", cabeza);
  icono.append(createElement(Lightbulb));
  const chip = crearElemento("span", "gr-globo-chip", cabeza);
  crearElemento("span", "gr-globo-pregunta", cabeza).textContent = "¿Por qué?";
  const titulo = crearElemento("p", "gr-globo-titulo", globo);
  const texto = crearElemento("p", "gr-globo-texto", globo);
  const barras = crearElemento("ul", "gr-globo-barras", globo);
  const resto = crearElemento("p", "gr-globo-resto", globo);
  const nota = crearElemento("p", "gr-globo-nota", globo);
  contenido.append(globo);

  let actual = null; // explicación que se muestra
  let anterior = null; // dónde quedó el globo en el paso anterior (px)

  function llenar(explicacion) {
    globo.dataset.tono = explicacion.tono;
    guia.dataset.tono = explicacion.tono;
    globo.setAttribute("aria-label", `Por qué: ${explicacion.titulo}`);
    chip.textContent = explicacion.etiqueta;
    titulo.textContent = explicacion.titulo;
    texto.textContent = explicacion.texto;
    nota.textContent = explicacion.nota;
    nota.hidden = !explicacion.nota;

    // Las barras se miden contra el mayor valor finito; ∞ llena la barra.
    const finitos = explicacion.barras.map(({ valor }) => valor).filter(Number.isFinite);
    const mayor = Math.max(...finitos, 0);
    barras.hidden = explicacion.barras.length === 0;
    barras.replaceChildren(
      ...explicacion.barras.map(({ nombre, detalle, valor, marca }) => {
        const fila = crearElemento("li");
        fila.dataset.marca = marca;
        const etiqueta = crearElemento("span", "gr-globo-barra-nombre", fila);
        crearElemento("b", "", etiqueta).textContent = nombre;
        if (detalle) crearElemento("small", "", etiqueta).textContent = detalle;
        const pista = crearElemento("span", "gr-globo-barra-pista", fila);
        const relleno = crearElemento("span", "gr-globo-barra-relleno", pista);
        const infinito = !Number.isFinite(valor);
        relleno.classList.toggle("is-infinito", infinito);
        // Un mínimo visible para que un 0 no desaparezca.
        const fraccion = infinito ? 1 : mayor > 0 ? Math.max(0.04, valor / mayor) : 0.04;
        relleno.style.setProperty("--fraccion", fraccion.toFixed(3));
        crearElemento("span", "gr-globo-barra-valor", fila).textContent = formatoNumero(valor);
        return fila;
      })
    );
    resto.hidden = explicacion.resto === 0;
    resto.textContent = `y ${explicacion.resto} más en la cola`;
  }

  function mostrarAbajo() {
    if (globo.parentElement !== abajo) abajo.append(globo);
    globo.dataset.modo = "abajo";
    globo.style.transform = "";
    abajo.hidden = false;
    guia.hidden = true;
    anterior = null;
  }

  // Prueba lugares en una rejilla sobre todo el dibujo y se queda con el
  // más barato: lo que tapa, más lo que se aleja del punto, más lo que
  // salta respecto al paso anterior (para que no brinque de un lado a otro).
  function colocar() {
    if (!actual) return;
    const medida = svg.getBoundingClientRect();
    if (medida.width < ANCHO_MINIMO_FLOTANTE) return mostrarAbajo();

    if (globo.parentElement !== contenido) contenido.append(globo);
    abajo.hidden = true;
    globo.dataset.modo = "flotante";

    const dibujo = geometria();
    const punto = dibujo.punto(actual.ancla);
    if (!punto) return mostrarAbajo();

    const escala = medida.width / dibujo.ancho;
    const [anchoTotal, altoTotal] = [medida.width, medida.height];
    const w = globo.offsetWidth;
    const h = globo.offsetHeight;
    const p = { x: punto.x * escala, y: punto.y * escala };
    const libre = punto.radio * escala + SEPARACION; // radio que no se tapa

    const estorbos = estorbosDe(dibujo, actual).map((e) => ({
      x1: e.x1 * escala,
      x2: e.x2 * escala,
      y1: e.y1 * escala,
      y2: e.y2 * escala,
      costo: e.costo,
    }));

    let mejor = null;
    for (let x = BORDE; x <= anchoTotal - w - BORDE; x += REJILLA) {
      for (let y = BORDE; y <= altoTotal - h - BORDE; y += REJILLA) {
        const rect = { x1: x, x2: x + w, y1: y, y2: y + h };
        const cerca = masCercano(rect, p);
        const distancia = Math.hypot(cerca.x - p.x, cerca.y - p.y);
        if (distancia < libre) continue;

        let costo = (distancia - libre) * COSTO_POR_PX_DE_DISTANCIA;
        if (anterior) costo += Math.hypot(x - anterior.x, y - anterior.y) * COSTO_POR_PX_DE_SALTO;
        if (mejor && costo >= mejor.costo) continue;
        for (const e of estorbos) {
          costo += area(rect, e) * e.costo;
          if (mejor && costo >= mejor.costo) break;
        }
        if (!mejor || costo < mejor.costo) mejor = { x, y, rect, cerca, costo };
      }
    }
    if (!mejor) return mostrarAbajo();

    // Primera vez (o al volver del modo abajo): aparece sin deslizarse.
    const sinTransicion = !anterior;
    globo.classList.toggle("is-sin-transicion", sinTransicion);
    guia.classList.toggle("is-sin-transicion", sinTransicion);
    globo.style.transform = `translate(${mejor.x.toFixed(1)}px, ${mejor.y.toFixed(1)}px)`;
    anterior = { x: mejor.x, y: mejor.y };

    // Guía: del borde de lo señalado al borde del globo.
    const dx = mejor.cerca.x - p.x;
    const dy = mejor.cerca.y - p.y;
    const largo = Math.hypot(dx, dy);
    const inicio = punto.radio * escala + 3;
    guia.hidden = largo - inicio < 4;
    guia.style.width = `${Math.max(0, largo - inicio).toFixed(1)}px`;
    guia.style.transform =
      `translate(${(p.x + (dx / largo) * inicio).toFixed(1)}px, ${(p.y + (dy / largo) * inicio).toFixed(1)}px) ` +
      `rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
  }

  new ResizeObserver(() => colocar()).observe(contenido);

  // Con el puntero encima, el globo se vuelve casi transparente para ver lo
  // que tapa (no recibe clics, así que se mide a mano).
  contenido.addEventListener("pointermove", (evento) => {
    if (globo.hidden || globo.dataset.modo !== "flotante") return;
    const { left, right, top, bottom } = globo.getBoundingClientRect();
    const encima =
      evento.clientX >= left && evento.clientX <= right && evento.clientY >= top && evento.clientY <= bottom;
    globo.classList.toggle("is-transparente", encima);
  });
  contenido.addEventListener("pointerleave", () => globo.classList.remove("is-transparente"));

  return {
    mostrar(explicacion) {
      actual = explicacion;
      if (!explicacion) {
        globo.hidden = true;
        guia.hidden = true;
        abajo.hidden = true;
        anterior = null;
        return;
      }
      llenar(explicacion);
      globo.hidden = false;
      colocar();
    },
  };
}
