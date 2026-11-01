// src/js/animador.js
import { coloresBarras } from "./tema.js";

export class MotorAnimacion {
  // opciones (opcionales): altura del área de barras y si se muestran los valores.
  constructor(containerElement, opciones = {}) {
    this.container = containerElement;
    this.altura = opciones.altura ?? "200px";
    this.mostrarValores = opciones.mostrarValores ?? true;
    // Colores de cada estado, tomados de _tokens.scss (--bar-*).
    this.colores = coloresBarras();
    this.intervalId = null;
    this.velocidadMs = 250;
    this.pasos = [];
    this.pasoActual = 0;
    this.enEjecucion = false;
    this.onPasoCallback = null;
  }

  cargarPasos(pasos) {
    this.detener();
    this.pasos = pasos;
    this.pasoActual = 0;
  }

  // `onPaso(paso, indice)` se llama cada vez que se dibuja un paso.
  reproducir(onPaso) {
    if (onPaso) this.onPasoCallback = onPaso;
    if (this.pasos.length === 0) return;
    if (this.intervalId) clearInterval(this.intervalId);

    this.enEjecucion = true;
    this.intervalId = setInterval(() => {
      if (this.pasoActual < this.pasos.length) {
        const paso = this.pasos[this.pasoActual];
        this.renderizarBarraEstado(paso);
        if (this.onPasoCallback) this.onPasoCallback(paso, this.pasoActual);
        this.pasoActual++;
      } else {
        this.pausar();
      }
    }, this.velocidadMs);
  }

  pausar() {
    this.enEjecucion = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  detener() {
    this.pausar();
    this.pasoActual = 0;
  }

  // Cambia la velocidad; si está reproduciendo, continúa con la nueva.
  fijarVelocidad(ms) {
    this.velocidadMs = Number(ms);
    if (this.enEjecucion) this.reproducir();
  }

  // Detiene y vuelve a dibujar el estado inicial.
  reiniciar() {
    this.detener();
    if (this.pasos.length === 0) return;
    this.renderizarBarraEstado(this.pasos[0]);
    if (this.onPasoCallback) this.onPasoCallback(this.pasos[0], 0);
  }

  // Las barras se crean una sola vez y en cada paso solo cambian su altura,
  // color y valor. Si se recrearan, la barra de desplazamiento de la gráfica
  // volvería al inicio en cada paso (issue #52). Estilos en _grafica.scss.
  renderizarBarraEstado(paso) {
    if (!this.container) return;

    const { arrayState, indices, tipo } = paso;
    const maxVal = Math.max(...arrayState, 1);

    // Solo se reconstruye si cambia el número de elementos o si alguien
    // vació el contenedor desde fuera.
    if (this.columnas?.length !== arrayState.length || !this.container.contains(this.area)) {
      this.construirBarras(arrayState.length);
    }

    // La transición nunca dura más que el paso, para que la barra alcance su
    // altura antes del siguiente.
    const transicionMs = Math.min(200, Math.round(this.velocidadMs * 0.6));
    this.area.style.setProperty("--grafica-transicion", `${transicionMs}ms`);

    const colores = this.colores;
    arrayState.forEach((valor, idx) => {
      const { barra, valor: etiqueta } = this.columnas[idx];

      let color = colores.base;
      if (indices && indices.includes(idx)) color = colores[tipo] ?? colores.base;
      else if (tipo === "completado") color = colores.completado;

      barra.style.height = `${Math.max((valor / maxVal) * 80, 8)}%`;
      barra.style.backgroundColor = color;
      if (etiqueta) etiqueta.textContent = valor;
    });
  }

  construirBarras(totalElementos) {
    this.container.classList.add("grafica");

    this.area = document.createElement("div");
    this.area.className = "grafica-area";
    this.area.style.height = this.altura;
    this.area.classList.toggle("is-densa", totalElementos > 10);
    this.area.classList.toggle("is-muy-densa", totalElementos > 12);

    this.columnas = Array.from({ length: totalElementos }, () => {
      const columna = document.createElement("div");
      columna.className = "grafica-columna";

      const barra = document.createElement("div");
      barra.className = "grafica-barra";
      columna.appendChild(barra);

      let valor = null;
      if (this.mostrarValores) {
        valor = document.createElement("span");
        valor.className = "grafica-valor";
        columna.appendChild(valor);
      }

      this.area.appendChild(columna);
      return { barra, valor };
    });

    this.container.replaceChildren(this.area);
  }
}