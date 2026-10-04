// src/js/animador.js

export class MotorAnimacion {
  constructor(containerElement) {
    this.container = containerElement;
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

  reproducir(onPaso) {
    if (onPaso) this.onPasoCallback = onPaso;
    if (this.pasos.length === 0) return;

    this.enEjecucion = true;
    this.intervalId = setInterval(() => {
      if (this.pasoActual < this.pasos.length) {
        const paso = this.pasos[this.pasoActual];
        this.renderizarBarraEstado(paso);
        if (this.onPasoCallback) this.onPasoCallback(paso);
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

  renderizarBarraEstado(paso) {
    if (!this.container) return;

    // Asegurar recortes de desbordamiento en el contenedor padre directos por código
    this.container.style.position = "relative";
    this.container.style.overflow = "hidden";
    this.container.style.width = "100%";

    const { arrayState, indices, tipo } = paso;
    const maxVal = Math.max(...arrayState, 1);
    const totalElementos = arrayState.length;

    this.container.innerHTML = "";

    // Contenedor interno flexible
    const chartArea = document.createElement("div");
    chartArea.style.display = "flex";
    chartArea.style.alignItems = "flex-end";
    chartArea.style.justifyContent = "center";
    chartArea.style.height = "200px";
    chartArea.style.padding = "10px 12px";
    chartArea.style.boxSizing = "border-box";
    chartArea.style.width = "100%";
    chartArea.style.overflowX = "auto"; // Muestra scroll interno sólo si excede la tarjeta
    chartArea.style.overflowY = "hidden";
    chartArea.style.gap = totalElementos > 10 ? "4px" : "10px";

    arrayState.forEach((valor, idx) => {
      const barContainer = document.createElement("div");
      barContainer.style.display = "flex";
      barContainer.style.flexDirection = "column";
      barContainer.style.alignItems = "center";
      barContainer.style.height = "100%";
      barContainer.style.justifyContent = "flex-end";
      
      // Ancho dinámico que escala automáticamente sin salirse de los márgenes
      barContainer.style.flex = "1";
      barContainer.style.maxWidth = "42px";
      barContainer.style.minWidth = "12px";

      const porcentajeAltura = Math.max((valor / maxVal) * 80, 8);

      const bar = document.createElement("div");
      bar.style.width = "100%";
      bar.style.height = `${porcentajeAltura}%`;
      bar.style.borderRadius = "4px 4px 0 0";
      bar.style.transition = "height 0.2s ease, background-color 0.2s ease";

      // Manejo de colores
      if (indices && indices.includes(idx)) {
        if (tipo === 'comparacion') bar.style.backgroundColor = '#f1c40f'; // Amarillo
        else if (tipo === 'intercambio') bar.style.backgroundColor = '#e74c3c'; // Rojo
        else bar.style.backgroundColor = '#ffffff';
      } else if (tipo === 'completado') {
        bar.style.backgroundColor = '#2ecc71'; // Verde
      } else {
        bar.style.backgroundColor = '#ffffff'; // Blanco original
      }

      const label = document.createElement("span");
      label.style.fontSize = totalElementos > 12 ? "11px" : "14px";
      label.style.color = "#ffffff";
      label.style.marginTop = "6px";
      label.style.fontWeight = "bold";
      label.style.fontFamily = "sans-serif";
      label.innerText = valor;

      barContainer.appendChild(bar);
      barContainer.appendChild(label);
      chartArea.appendChild(barContainer);
    });

    this.container.appendChild(chartArea);
  }
}