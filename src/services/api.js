import mockData from '../data/mockResponse.json'; // REVERTIR CAMBIOS REALIZADOS

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const fetchSortSteps = async (algorithmId, array) => {
  try {
    const response = await fetch(`${API_URL}/sort/${algorithmId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ array }),
    });

    if (!response.ok) throw new Error('Servidor no disponible');
    return await response.json();
  } catch (error) {
    console.warn('Backend no detectado. Usando datos de prueba (Mock Local):', error);
    // Devuelve los datos de prueba si el backend está apagado
    return mockData;
  }
};