import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { StationResponse } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const STATION_COLORS = [
  {
    precipitation: { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.8)' },
  },
  {
    precipitation: { border: 'rgb(34, 197, 95)', bg: 'rgba(34, 197, 95, 0.8)' },
  },
];

interface PrecipitationChartProps {
  datasets: StationResponse[];
}

export function PrecipitationChart({ datasets }: PrecipitationChartProps) {
  const primaryData = datasets[0];
  const reversedData = [...primaryData.data].reverse();
  const labels = reversedData.map(d => d.date);

  const chartDatasets = datasets.map((dataset, stationIndex) => {
    const stationData = [...dataset.data].reverse();
    const isCompare = stationIndex === 1;
    return {
      label: dataset.stationName,
      data: stationData.map(d => d.precipitation),
      backgroundColor: STATION_COLORS[stationIndex].precipitation.bg,
      borderColor: STATION_COLORS[stationIndex].precipitation.border,
      borderWidth: 1,
      borderDash: isCompare ? [8, 4] : undefined,
    };
  });

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
        text: 'Precipitación (mm)',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Precipitación (mm)',
        },
        stacked: false,
      },
    },
  };

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
}