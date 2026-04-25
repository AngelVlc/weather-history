import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { StationResponse } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const STATION_COLORS = [
  {
    max: { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.5)' },
    avg: { border: 'rgb(234, 179, 8)', bg: 'rgba(234, 179, 8, 0.5)' },
    min: { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.5)' },
  },
  {
    max: { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.5)' },
    avg: { border: 'rgb(234, 179, 8)', bg: 'rgba(234, 179, 8, 0.5)' },
    min: { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.5)' },
  },
];

interface TemperatureChartProps {
  datasets: StationResponse[];
}

export function TemperatureChart({ datasets }: TemperatureChartProps) {
  const [showMax, setShowMax] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [showMin, setShowMin] = useState(true);

  const primaryData = datasets[0];
  const reversedData = [...primaryData.data].reverse();
  const labels = reversedData.map(d => d.date);

  const chartDatasets = [];

  for (let i = 0; i < datasets.length; i++) {
    const stationData = [...datasets[i].data].reverse();
    const stationIndex = i;
    const stationName = datasets[i].stationName;
    const isCompare = stationIndex === 1;

    if (showMax) {
      chartDatasets.push({
        label: `${stationName} - Temp. Máx.`,
        data: stationData.map(d => d.tempMax),
        borderColor: STATION_COLORS[stationIndex].max.border,
        backgroundColor: STATION_COLORS[stationIndex].max.bg,
        tension: 0.3,
        borderDash: isCompare ? [8, 4] : undefined,
      });
    }

    if (showAvg) {
      chartDatasets.push({
        label: `${stationName} - Temp. Media`,
        data: stationData.map(d => d.tempAvg),
        borderColor: STATION_COLORS[stationIndex].avg.border,
        backgroundColor: STATION_COLORS[stationIndex].avg.bg,
        tension: 0.3,
        borderDash: isCompare ? [8, 4] : undefined,
      });
    }

    if (showMin) {
      chartDatasets.push({
        label: `${stationName} - Temp. Mín.`,
        data: stationData.map(d => d.tempMin),
        borderColor: STATION_COLORS[stationIndex].min.border,
        backgroundColor: STATION_COLORS[stationIndex].min.bg,
        tension: 0.3,
        borderDash: isCompare ? [8, 4] : undefined,
      });
    }
  }

  const chartData = {
    labels,
    datasets: chartDatasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Temperatura (°C)',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Temperatura (°C)',
        },
      },
    },
  };

  return (
    <div>
      <div className="flex gap-4 mb-4 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showMax}
            onChange={(e) => setShowMax(e.target.checked)}
            className="mr-1"
          />
          <span className="text-red-600 font-medium">Máx.</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showAvg}
            onChange={(e) => setShowAvg(e.target.checked)}
            className="mr-1"
          />
          <span className="text-yellow-500 font-medium">Media</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showMin}
            onChange={(e) => setShowMin(e.target.checked)}
            className="mr-1"
          />
          <span className="text-blue-600 font-medium">Mín.</span>
        </label>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}