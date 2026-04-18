import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemperatureChart } from '../components/TemperatureChart';
import { PrecipitationChart } from '../components/PrecipitationChart';
import { fetchStationData } from '../api/weather';
import { StationResponse } from '../types';

export function Station() {
  const { stationId } = useParams<{ stationId: string }>();
  const [data, setData] = useState<StationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!stationId) return;
    
    fetchStationData(stationId, 7)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [stationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando datos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {error || 'No se encontraron datos'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white py-6 px-4">
        <div className="container mx-auto">
          <button
            onClick={() => navigate('/')}
            className="text-white hover:underline mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold">{data.stationName}</h1>
          <p className="text-blue-200">{data.territoryName}</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <TemperatureChart data={data.data} />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <PrecipitationChart data={data.data} />
          </div>
        </div>
      </main>
    </div>
  );
}