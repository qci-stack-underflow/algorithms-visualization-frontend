// Reproductor de pasos: botones, barra de progreso, velocidad y teclado.
// No sabe nada de grafos: solo lleva la cuenta del paso actual y avisa con
// `alMostrar(indice)` cada vez que cambia.
import { Pause, Play, createElement } from "lucide";

const INTERVALO_BASE_MS = 1000; // a 1x, un paso por segundo

export function crearReproductor(raiz, { alMostrar }) {
  const botones = {
    inicio: raiz.querySelector('[data-accion="inicio"]'),
    anterior: raiz.querySelector('[data-accion="anterior"]'),
    reproducir: raiz.querySelector('[data-accion="reproducir"]'),
    siguiente: raiz.querySelector('[data-accion="siguiente"]'),
    final: raiz.querySelector('[data-accion="final"]'),
  };
  const progreso = raiz.querySelector("[data-progreso]");
  const contador = raiz.querySelector("[data-paso]");
  const velocidades = [...raiz.querySelectorAll("[data-velocidad]")];

  let total = 0; // cantidad de pasos
  let indice = 0;
  let velocidad = 1;
  let temporizador = null;

  const ultimo = () => Math.max(0, total - 1);
  const reproduciendo = () => temporizador !== null;

  function actualizarControles() {
    progreso.max = ultimo();
    progreso.value = indice;
    // El paso 0 es el estado inicial; se cuenta desde ahí hasta el último.
    contador.textContent = `${indice} / ${ultimo()}`;
    progreso.setAttribute("aria-valuetext", `Paso ${indice} de ${ultimo()}`);

    botones.inicio.disabled = botones.anterior.disabled = indice === 0;
    botones.siguiente.disabled = botones.final.disabled = indice === ultimo();
    botones.reproducir.disabled = total <= 1;

    botones.reproducir.replaceChildren(createElement(reproduciendo() ? Pause : Play));
    botones.reproducir.setAttribute("aria-label", reproduciendo() ? "Pausar" : "Reproducir");
  }

  function pausar() {
    clearTimeout(temporizador);
    temporizador = null;
    actualizarControles();
  }

  function irA(nuevo) {
    indice = Math.max(0, Math.min(ultimo(), nuevo));
    actualizarControles();
    alMostrar(indice, { reproduciendo: reproduciendo() });
  }

  function programar() {
    temporizador = setTimeout(() => {
      temporizador = null;
      // Si todavía queda otro paso, se programa antes de mostrar este para
      // que irA ya lo cuente como "reproduciendo". En el último se detiene.
      if (indice + 1 < ultimo()) programar();
      irA(indice + 1);
    }, INTERVALO_BASE_MS / velocidad);
  }

  function reproducir() {
    if (total <= 1) return;
    // Al final, reproducir empieza de nuevo.
    if (indice >= ultimo()) irA(0);
    programar();
    actualizarControles();
  }

  function alternar() {
    if (reproduciendo()) {
      pausar();
      alMostrar(indice, { reproduciendo: false });
    } else {
      reproducir();
    }
  }

  // Cualquier movimiento a mano pausa la reproducción.
  const mover = (destino) => {
    pausar();
    irA(destino);
  };

  botones.inicio.addEventListener("click", () => mover(0));
  botones.anterior.addEventListener("click", () => mover(indice - 1));
  botones.siguiente.addEventListener("click", () => mover(indice + 1));
  botones.final.addEventListener("click", () => mover(ultimo()));
  botones.reproducir.addEventListener("click", alternar);
  progreso.addEventListener("input", () => mover(Number(progreso.value)));

  velocidades.forEach((boton) =>
    boton.addEventListener("click", () => {
      velocidad = Number(boton.dataset.velocidad);
      velocidades.forEach((otro) => {
        otro.classList.toggle("is-activa", otro === boton);
        otro.setAttribute("aria-checked", String(otro === boton));
      });
      if (reproduciendo()) {
        clearTimeout(temporizador);
        programar();
      }
    })
  );

  // Atajos: ← → y Espacio, salvo que se esté escribiendo o usando un control.
  document.addEventListener("keydown", (evento) => {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
    const enControl = evento.target.closest?.(
      "input, select, textarea, button, a, summary, [role='button'], [contenteditable]"
    );
    if (enControl) return;

    if (evento.key === "ArrowRight") mover(indice + 1);
    else if (evento.key === "ArrowLeft") mover(indice - 1);
    else if (evento.key === " ") alternar();
    else return;
    evento.preventDefault();
  });

  return {
    // Carga una ejecución nueva y se queda en el paso inicial, en pausa.
    cargar(cantidadDePasos) {
      clearTimeout(temporizador);
      temporizador = null;
      total = cantidadDePasos;
      irA(0);
    },
    pausar,
    get indice() {
      return indice;
    },
  };
}
