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
import { StationData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PrecipitationChartProps {
  data: StationData[];
}

export function PrecipitationChart({ data }: PrecipitationChartProps) {
  const reversedData = [...data].reverse();

  const chartData = {
    labels: reversedData.map(d => d.date),
    datasets: [
      {
        label: 'Precipitación (mm)',
        data: reversedData.map(d => d.precipitation),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Precipitación (mm)',
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}