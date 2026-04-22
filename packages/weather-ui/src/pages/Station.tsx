import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemperatureChart } from '../components/TemperatureChart';
import { PrecipitationChart } from '../components/PrecipitationChart';
import { fetchStationData } from '../api/weather';
import { StationResponse } from '../types';

const DAY_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
];

export function Station() {
  const { stationId } = useParams<{ stationId: string }>();
  const [data, setData] = useState<StationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    if (!stationId) return;

    setLoading(true);
    fetchStationData(stationId, days)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [stationId, days]);

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
        <div className="flex justify-center mb-8">
          <label htmlFor="days-select" className="mr-2 text-gray-700 font-medium">
            Rango:
          </label>
          <select
            id="days-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 bg-white text-gray-700"
          >
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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