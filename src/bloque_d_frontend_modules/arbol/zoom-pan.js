/**
 * D3: Control interactivo de Zoom, Pan (arrastre) y Ajuste para SVG.
 */

export class ControllerZoomPan {
  constructor(svgElement, containerElement) {
    this.svg = svgElement;
    this.container = containerElement;
    this.isPanning = false;
    this.startPoint = { x: 0, y: 0 };
    this.viewBox = { x: 0, y: 0, w: 1000, h: 600 };
    this.contentBounds = { xMin: 0, xMax: 1000, yMin: 0, yMax: 600 };

    this.initEvents();
  }

  initEvents() {
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
      this.zoomAt(e.clientX, e.clientY, zoomFactor);
    }, { passive: false });

    this.svg.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isPanning = true;
      this.startPoint = { x: e.clientX, y: e.clientY };
      this.svg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = (e.clientX - this.startPoint.x) * (this.viewBox.w / this.container.clientWidth);
      const dy = (e.clientY - this.startPoint.y) * (this.viewBox.h / this.container.clientHeight);
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.startPoint = { x: e.clientX, y: e.clientY };
      this.updateViewBox();
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.svg.style.cursor = 'grab';
    });

    // Soporte Táctil para Móviles
    let lastTouchDist = 0;
    this.svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isPanning = true;
        this.startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isPanning = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    this.svg.addEventListener('touchmove', (e) => {
      if (this.isPanning && e.touches.length === 1) {
        const dx = (e.touches[0].clientX - this.startPoint.x) * (this.viewBox.w / this.container.clientWidth);
        const dy = (e.touches[0].clientY - this.startPoint.y) * (this.viewBox.h / this.container.clientHeight);
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.updateViewBox();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = lastTouchDist / dist;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.zoomAt(centerX, centerY, factor);
        lastTouchDist = dist;
      }
    });

    this.svg.addEventListener('touchend', () => {
      this.isPanning = false;
    });
  }

  zoomAt(clientX, clientY, factor) {
    const rect = this.svg.getBoundingClientRect();
    const mouseX = this.viewBox.x + (clientX - rect.left) * (this.viewBox.w / rect.width);
    const mouseY = this.viewBox.y + (clientY - rect.top) * (this.viewBox.h / rect.height);

    const newW = this.viewBox.w * factor;
    const newH = this.viewBox.h * factor;

    this.viewBox.x = mouseX - (mouseX - this.viewBox.x) * factor;
    this.viewBox.y = mouseY - (mouseY - this.viewBox.y) * factor;
    this.viewBox.w = newW;
    this.viewBox.h = newH;

    this.updateViewBox();
  }

  zoomIn() {
    this.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
  }

  zoomOut() {
    this.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
  }

  fitToContent(bounds) {
    if (bounds) this.contentBounds = bounds;
    const padding = 40;
    this.viewBox.x = this.contentBounds.xMin - padding;
    this.viewBox.y = this.contentBounds.yMin - padding;
    this.viewBox.w = (this.contentBounds.xMax - this.contentBounds.xMin) + padding * 2;
    this.viewBox.h = (this.contentBounds.yMax - this.contentBounds.yMin) + padding * 2;
    this.updateViewBox();
  }

  updateViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
  }
}
