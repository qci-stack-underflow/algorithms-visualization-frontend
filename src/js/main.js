// src/js/main.js
import { MotorAnimacion } from './animador.js';

const contenedorGrafico = document.getElementById("contenedorGrafico");
const motor = new MotorAnimacion(contenedorGrafico);

// Referencias a la interfaz
const btnReproducir = document.getElementById("btnReproducir");
const btnPausar = document.getElementById("btnPausar");
const btnReiniciar = document.getElementById("btnReiniciar");
const selectVelocidad = document.getElementById("selectVelocidad");

// Pasos generados previamente por el algoritmo de ordenamiento
const pasosAlgoritmo = [ /* tu arreglo de pasos */ ];

// Cargar pasos iniciales en el motor
motor.cargarPasos(pasosAlgoritmo);

// --- EVENTOS ---

// 1. Reproducir
btnReproducir.addEventListener("click", () => {
  motor.reproducir();
});

// 2. Pausar
btnPausar.addEventListener("click", () => {
  motor.pausar();
});

// 3. Reiniciar (Regresa al estado inicial)
btnReiniciar.addEventListener("click", () => {
  motor.reiniciar();
});

// 4. Selector de velocidad (Actualiza en tiempo real)
selectVelocidad.addEventListener("click", (e) => {
  motor.fijarVelocidad(e.target.value);
});