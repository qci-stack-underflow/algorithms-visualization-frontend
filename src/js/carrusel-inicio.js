// Carrusel de las tarjetas de la presentación del inicio.
//
// Hay tres ranuras (izquierda, centro y derecha) y siete tarjetas en
// <template data-tarjeta> dentro de index.html. Cada pocos segundos cambia
// una ranura, en orden (derecha, izquierda, centro…), así que cada tarjeta se
// queda unos diez segundos y nunca cambian todas a la vez.
//
// Regla: la ranura del centro siempre muestra una tarjeta de grafos o de
// Huffman (data-familia="algoritmo"); las de los lados pueden mostrar
// cualquiera. Así siempre hay al menos una de algoritmos, también en
// celular, donde solo se ve la del centro. Nunca se repite una tarjeta que
// ya está en pantalla.
//
// No se mueve si se prefiere menos movimiento, si el puntero está encima,
// si la presentación no está a la vista o si la pestaña está oculta.
import { prefiereMenosMovimiento } from "./inicio.js";

const INTERVALO_MS = 3500;
const SALIDA_MS = 320; // igual que la transición de .hero-card-cuerpo
const ORDEN_DE_CAMBIO = [2, 0, 1]; // derecha, izquierda, centro
const CENTRO = 1;

export function iniciarCarrusel() {
  const carrusel = document.querySelector("[data-carrusel]");
  if (!carrusel) return;

  const ranuras = [...carrusel.querySelectorAll("[data-carrusel-ranura]")];
  const plantillas = new Map(
    [...document.querySelectorAll("template[data-tarjeta]")].map((plantilla) => [
      plantilla.dataset.tarjeta,
      plantilla,
    ])
  );
  if (ranuras.length !== 3 || plantillas.size < 4 || prefiereMenosMovimiento()) return;

  const todas = [...plantillas.keys()];
  const algoritmos = todas.filter((id) => plantillas.get(id).dataset.familia === "algoritmo");
  const cuerpoDe = (ranura) => ranura.querySelector(".hero-card-cuerpo");
  // En pantallas angostas las tarjetas de los lados se ocultan con CSS: solo
  // cuentan las que se ven, así en celular la del centro recorre todas las
  // de algoritmos.
  const seVe = (indice) => ranuras[indice].offsetParent !== null;
  const enPantalla = () =>
    ranuras.flatMap((ranura, indice) => (seVe(indice) ? [cuerpoDe(ranura).dataset.tarjeta] : []));

  // La siguiente tarjeta de una ranura: la que sigue en su lista y no está
  // en pantalla. Así cada ranura recorre su lista completa antes de repetir.
  function siguiente(indice) {
    const lista = indice === CENTRO ? algoritmos : todas;
    const ocupadas = enPantalla();
    const actual = lista.indexOf(cuerpoDe(ranuras[indice]).dataset.tarjeta);
    for (let paso = 1; paso <= lista.length; paso++) {
      const candidata = lista[(actual + paso) % lista.length];
      if (!ocupadas.includes(candidata)) return candidata;
    }
    return null;
  }

  function cambiar(indice) {
    const id = siguiente(indice);
    if (!id) return;
    const viejo = cuerpoDe(ranuras[indice]);
    viejo.classList.add("is-saliendo");

    setTimeout(() => {
      const nuevo = document.createElement("div");
      nuevo.className = "hero-card-cuerpo is-entrando";
      nuevo.dataset.tarjeta = id;
      nuevo.append(plantillas.get(id).content.cloneNode(true));
      viejo.replaceWith(nuevo);
      // Un cuadro después se quita la clase para que la transición corra.
      requestAnimationFrame(() => requestAnimationFrame(() => nuevo.classList.remove("is-entrando")));
    }, SALIDA_MS);
  }

  let turno = 0;
  let temporizador = null;
  let aLaVista = true;
  let encima = false;

  const debeCorrer = () => aLaVista && !encima && !document.hidden;

  function programar() {
    clearTimeout(temporizador);
    temporizador = null;
    if (!debeCorrer()) return;
    temporizador = setTimeout(() => {
      const orden = ORDEN_DE_CAMBIO.filter(seVe);
      if (orden.length > 0) cambiar(orden[turno % orden.length]);
      turno++;
      programar();
    }, INTERVALO_MS);
  }

  carrusel.addEventListener("pointerenter", () => {
    encima = true;
    programar();
  });
  carrusel.addEventListener("pointerleave", () => {
    encima = false;
    programar();
  });
  document.addEventListener("visibilitychange", programar);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entrada]) => {
      aLaVista = entrada.isIntersecting;
      programar();
    }).observe(carrusel);
  }

  programar();
}
