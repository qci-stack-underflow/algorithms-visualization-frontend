import React, { useState, useRef } from 'react';
import { ALGORITHMS } from './data/algorithmsData';
import { SortingCard } from './components/SortingCard';
import { BarChart } from './components/BarChart';
import { ControlPanel } from './components/ControlPanel';
import { Navbar } from './components/Navbar';
import { MetricsChart } from './components/MetricsChart';
import { fetchSortSteps } from './services/api';

export default function App() {
  const [view, setView] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [complexityFilter, setComplexityFilter] = useState('ALL');

  // Estados de control de simulación
  const [elementsCount, setElementsCount] = useState(5);
  const [customElements, setCustomElements] = useState('10, 4, 8, 3, 7');
  const [speed, setSpeed] = useState(250);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['bubble', 'selection']);
  const [isRunning, setIsRunning] = useState(false);

  // Estados de animación para Algoritmo 1
  const [dataAlgo1, setDataAlgo1] = useState([10, 4, 8, 3, 7]);
  const [comparing1, setComparing1] = useState([]);
  const [swapped1, setSwapped1] = useState([]);

  // Estados de animación para Algoritmo 2 (Modo Comparación)
  const [dataAlgo2, setDataAlgo2] = useState([10, 4, 8, 3, 7]);
  const [comparing2, setComparing2] = useState([]);
  const [swapped2, setSwapped2] = useState([]);

  // Evidencia cuantitativa (Métricas de comparación)
  const [metrics, setMetrics] = useState([]);
  const timerRef = useRef([]);

  // Filtrado de algoritmos para el catálogo principal
  const filteredAlgorithms = ALGORITHMS.filter((algo) => {
    const matchesSearch = algo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComplexity = complexityFilter === 'ALL' || algo.complexity === complexityFilter;
    return matchesSearch && matchesComplexity;
  });

  // Parsear el string de elementos ingresado por el usuario
  const parseInputArray = () => {
    return customElements
      .split(',')
      .map((num) => Number(num.trim()))
      .filter((num) => !isNaN(num));
  };

  // Requisito 5: Reiniciar simulación
  const handleReset = () => {
    timerRef.current.forEach(clearInterval);
    timerRef.current = [];
    setIsRunning(false);

    const initial = parseInputArray();
    setDataAlgo1(initial);
    setDataAlgo2(initial);
    setComparing1([]);
    setSwapped1([]);
    setComparing2([]);
    setSwapped2([]);
    setMetrics([]);
  };

  // Requisitos 3, 4 y 9: Iniciar simulación gráfica individual o en paralelo
  const handleRun = async () => {
    if (isRunning) return;
    handleReset();
    setIsRunning(true);

    const inputArray = parseInputArray();
    if (inputArray.length === 0) {
      alert('Ingresa una lista válida de números.');
      setIsRunning(false);
      return;
    }

    const algo1Id = selectedAlgorithms[0];
    const algo2Id = isCompareMode ? selectedAlgorithms[1] : null;

    // Petición de datos con el mismo arreglo de origen
    const res1 = await fetchSortSteps(algo1Id, inputArray);
    const res2 = algo2Id ? await fetchSortSteps(algo2Id, inputArray) : null;

    const newMetrics = [];
    if (res1 && res1.comparisons !== undefined) {
      newMetrics.push({
        algorithm: ALGORITHMS.find((a) => a.id === algo1Id)?.name || algo1Id,
        comparisons: res1.comparisons,
        swaps: res1.swaps || 0,
        executionTimeMs: res1.executionTimeMs || 0,
        complexity: ALGORITHMS.find((a) => a.id === algo1Id)?.complexity || '',
      });
    }

    if (res2 && res2.comparisons !== undefined) {
      newMetrics.push({
        algorithm: ALGORITHMS.find((a) => a.id === algo2Id)?.name || algo2Id,
        comparisons: res2.comparisons,
        swaps: res2.swaps || 0,
        executionTimeMs: res2.executionTimeMs || 0,
        complexity: ALGORITHMS.find((a) => a.id === algo2Id)?.complexity || '',
      });
    }

    setMetrics(newMetrics);

    // Animación de Algoritmo 1
    if (res1 && res1.steps) {
      let stepIdx1 = 0;
      const interval1 = setInterval(() => {
        if (stepIdx1 < res1.steps.length) {
          const step = res1.steps[stepIdx1];
          setDataAlgo1([...step.array]);
          setComparing1(step.comparing || []);
          setSwapped1(step.swapped ? step.comparing : []);
          stepIdx1++;
        } else {
          clearInterval(interval1);
          setComparing1([]);
          setSwapped1([]);
        }
      }, speed);
      timerRef.current.push(interval1);
    }

    // Animación de Algoritmo 2 (si está en modo comparación)
    if (res2 && res2.steps) {
      let stepIdx2 = 0;
      const interval2 = setInterval(() => {
        if (stepIdx2 < res2.steps.length) {
          const step = res2.steps[stepIdx2];
          setDataAlgo2([...step.array]);
          setComparing2(step.comparing || []);
          setSwapped2(step.swapped ? step.comparing : []);
          stepIdx2++;
        } else {
          clearInterval(interval2);
          setComparing2([]);
          setSwapped2([]);
        }
      }, speed);
      timerRef.current.push(interval2);
    }

    // Liberar estado de ejecución
    const maxSteps = Math.max(res1?.steps?.length || 0, res2?.steps?.length || 0);
    setTimeout(() => {
      setIsRunning(false);
    }, maxSteps * speed + 200);
  };

  return (
    <div className="min-h-screen bg-[#181818] text-white flex flex-col font-sans">
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* Vista Catálogo */}
      {view === 'home' && (
        <main className="p-8 max-w-6xl mx-auto w-full flex-1">
          <div className="flex items-center justify-between mb-6">
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value)}
              className="bg-[#2a2a2a] text-sm border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="ALL">Filtrar por complejidad</option>
              <option value="O(n²)">O(n²)</option>
              <option value="O(n log n)">O(n log n)</option>
            </select>

            <button
              onClick={() => setView('visualizer')}
              className="bg-blue-600 hover:bg-blue-500 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            >
              Ir a Visualizador →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredAlgorithms.map((algo) => (
              <SortingCard
                key={algo.id}
                {...algo}
                onSelect={() => {
                  setSelectedAlgorithms([algo.id]);
                  setView('visualizer');
                }}
              />
            ))}
          </div>
        </main>
      )}

      {/* Vista Visualizador / Comparador */}
      {view === 'visualizer' && (
        <main className="flex-1 p-6 flex flex-col md:flex-row gap-6 max-w-7xl mx-auto w-full">
          <ControlPanel
            elementsCount={elementsCount}
            setElementsCount={setElementsCount}
            customElements={customElements}
            setCustomElements={setCustomElements}
            isCompareMode={isCompareMode}
            setIsCompareMode={setIsCompareMode}
            selectedAlgorithms={selectedAlgorithms}
            setSelectedAlgorithms={setSelectedAlgorithms}
            algorithms={ALGORITHMS}
            onRun={handleRun}
            onReset={handleReset}
            isRunning={isRunning}
            speed={speed}
            setSpeed={setSpeed}
          />

          <div className="flex-1 bg-[#121212] p-6 rounded-xl border border-gray-800 flex flex-col justify-between relative min-h-[500px]">
            <button
              onClick={() => setView('home')}
              className="absolute top-6 right-6 bg-[#262626] hover:bg-[#333] text-xs px-3 py-1.5 rounded-lg border border-gray-700 transition-all z-10"
            >
              Regresar ↵
            </button>

            {/* Requisito 4 y Comparación Gráfica */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center my-auto w-full pt-10">
              <BarChart
                array={dataAlgo1}
                title={`${ALGORITHMS.find((a) => a.id === selectedAlgorithms[0])?.name || ''} (${ALGORITHMS.find((a) => a.id === selectedAlgorithms[0])?.complexity || ''})`}
                comparingIndices={comparing1}
                activeIndices={swapped1}
              />

              {isCompareMode && selectedAlgorithms[1] && (
                <BarChart
                  array={dataAlgo2}
                  title={`${ALGORITHMS.find((a) => a.id === selectedAlgorithms[1])?.name || ''} (${ALGORITHMS.find((a) => a.id === selectedAlgorithms[1])?.complexity || ''})`}
                  comparingIndices={comparing2}
                  activeIndices={swapped2}
                />
              )}
            </div>

            {/* Evidencia cuantitativa requerida */}
            {metrics.length > 0 && <MetricsChart metricsData={metrics} />}
          </div>
        </main>
      )}
    </div>
  );
}