import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StationCard } from '../components/StationCard';
import { fetchStations } from '../api/weather';
import { Station } from '../types';

export function Landing() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStations()
      .then(setStations)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando estaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white py-6 px-4">
        <h1 className="text-2xl font-bold text-center">Estaciones Meteorológicas</h1>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map(station => (
            <StationCard
              key={station.id}
              station={station}
              onClick={() => navigate(`/station/${station.id}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}