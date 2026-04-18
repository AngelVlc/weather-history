import { Station } from '../types';

interface StationCardProps {
  station: Station;
  onClick: () => void;
}

export function StationCard({ station, onClick }: StationCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 w-full"
    >
      <h3 className="text-lg font-semibold text-gray-800">{station.name}</h3>
      <p className="text-gray-600">{station.territory}</p>
    </button>
  );
}