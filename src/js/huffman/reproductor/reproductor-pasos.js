/**
 * D4: Reproductor genérico de pasos reocupable por MotorAnimacion.
 */

export class ReproductorPasos {
  constructor({ totalPasos, onPasoChange, onPlayStateChange }) {
    this.totalPasos = totalPasos;
    this.currentPaso = 0;
    this.onPasoChange = onPasoChange;
    this.onPlayStateChange = onPlayStateChange;
    this.isPlaying = false;
    this.speed = 1.0;
    this.timer = null;
  }

  setTotalPasos(total) {
    this.totalPasos = total;
    if (this.currentPaso >= total) {
      this.currentPaso = Math.max(0, total - 1);
    }
    this.notificarPaso();
  }

  play() {
    if (this.isPlaying || this.totalPasos === 0) return;
    if (this.currentPaso >= this.totalPasos - 1) {
      this.currentPaso = 0;
    }
    this.isPlaying = true;
    if (this.onPlayStateChange) this.onPlayStateChange(true);
    this.scheduleNextStep();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  scheduleNextStep() {
    if (!this.isPlaying) return;
    const delay = 1000 / this.speed;
    this.timer = setTimeout(() => {
      if (this.currentPaso < this.totalPasos - 1) {
        this.nextStep();
        this.scheduleNextStep();
      } else {
        this.pause();
      }
    }, delay);
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  goToPaso(index) {
    this.currentPaso = Math.max(0, Math.min(index, this.totalPasos - 1));
    this.notificarPaso();
  }

  nextStep() {
    if (this.currentPaso < this.totalPasos - 1) {
      this.currentPaso++;
      this.notificarPaso();
    }
  }

  previousStep() {
    if (this.currentPaso > 0) {
      this.currentPaso--;
      this.notificarPaso();
    }
  }

  goToStart() {
    this.goToPaso(0);
  }

  goToEnd() {
    this.goToPaso(this.totalPasos - 1);
  }

  notificarPaso() {
    if (this.onPasoChange) {
      this.onPasoChange(this.currentPaso);
    }
  }
}
