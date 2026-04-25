import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { TemperatureChart } from '../components/TemperatureChart';
import { PrecipitationChart } from '../components/PrecipitationChart';
import { fetchStationData, fetchStations } from '../api/weather';
import { StationResponse, type Station } from '../types';

const DAY_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
];

export function Station() {
  const { stationId } = useParams<{ stationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [stations, setStations] = useState<Station[]>([]);
  const [data, setData] = useState<StationResponse | null>(null);
  const [compareData, setCompareData] = useState<StationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [compareStationId, setCompareStationId] = useState<string | null>(
    searchParams.get('compare') || null
  );

  useEffect(() => {
    fetchStations().then(setStations).catch(console.error);
  }, []);

  useEffect(() => {
    if (!stationId) return;

    setLoading(true);
    fetchStationData(stationId, days)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [stationId, days]);

  useEffect(() => {
    if (!compareStationId || !stationId) {
      setCompareData(null);
      return;
    }

    setLoadingCompare(true);
    fetchStationData(compareStationId, days)
      .then(setCompareData)
      .catch(err => {
        console.error('Failed to fetch compare station:', err);
        setCompareData(null);
      })
      .finally(() => setLoadingCompare(false));
  }, [compareStationId, days]);

  const handleCompareChange = (newCompareId: string | null) => {
    setCompareStationId(newCompareId);
    if (newCompareId) {
      setSearchParams({ compare: newCompareId });
    } else {
      setSearchParams({});
    }
  };

  const allData = useMemo(() => {
    if (!data) return [];
    if (!compareData) return [data];
    return [data, compareData];
  }, [data, compareData]);

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
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div>
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
          <div>
            <label htmlFor="compare-select" className="mr-2 text-gray-700 font-medium">
              Comparar con:
            </label>
            <select
              id="compare-select"
              value={compareStationId || ''}
              onChange={(e) => handleCompareChange(e.target.value || null)}
              className="border border-gray-300 rounded px-3 py-1 bg-white text-gray-700"
            >
              <option value="">NINGUNA</option>
              {stations
                .filter(s => s.id !== stationId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.territory})
                  </option>
                ))}
            </select>
          </div>
        </div>
        {!loadingCompare && compareData && (
          <p className="text-center text-sm text-gray-600 mb-4">
            Comparando: <strong>{data.stationName}</strong> vs <strong>{compareData.stationName}</strong>
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <TemperatureChart datasets={allData} />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <PrecipitationChart datasets={allData} />
          </div>
        </div>
      </main>
    </div>
  );
}