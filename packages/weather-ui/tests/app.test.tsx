import { render, screen, fireEvent } from '@testing-library/react';
import { TemperatureChart } from '../components/TemperatureChart';
import { PrecipitationChart } from '../components/PrecipitationChart';
import { StationResponse } from '../types';

const mockStationData: StationResponse = {
  stationId: 'c20m236e02',
  stationName: 'Test Station 1',
  territory: 'c20',
  territoryName: 'Castelló',
  days: 7,
  until: '2026-04-23',
  data: [
    { date: '2026-04-23', tempMax: 25, tempMin: 15, tempAvg: 20, precipitation: 0 },
    { date: '2026-04-22', tempMax: 26, tempMin: 16, tempAvg: 21, precipitation: 5 },
  ],
};

const mockCompareStationData: StationResponse = {
  stationId: 'c20m236e03',
  stationName: 'Test Station 2',
  territory: 'c20',
  territoryName: 'Castelló',
  days: 7,
  until: '2026-04-23',
  data: [
    { date: '2026-04-23', tempMax: 22, tempMin: 12, tempAvg: 17, precipitation: 2 },
    { date: '2026-04-22', tempMax: 23, tempMin: 13, tempAvg: 18, precipitation: 8 },
  ],
};

const mockStations = [
  { id: 'c20m236e02', name: 'Test Station 1', territory: 'c20' },
  { id: 'c20m236e03', name: 'Test Station 2', territory: 'c20' },
];

describe('TemperatureChart', () => {
  it('renders temperature lines from single station', () => {
    render(<TemperatureChart datasets={[mockStationData]} />);
    expect(screen.getByText('Temperatura (°C)')).toBeInTheDocument();
  });

  it('renders temperature lines from both stations for comparison', () => {
    render(<TemperatureChart datasets={[mockStationData, mockCompareStationData]} />);
    expect(screen.getByText('Temperatura (°C)')).toBeInTheDocument();
    expect(screen.getByText('Test Station 1 - Temp. Máx.')).toBeInTheDocument();
    expect(screen.getByText('Test Station 2 - Temp. Máx.')).toBeInTheDocument();
  });

  it('shows checkboxes for toggling temperature visibility', () => {
    render(<TemperatureChart datasets={[mockStationData]} />);
    expect(screen.getByLabelText('Máx.')).toBeInTheDocument();
    expect(screen.getByLabelText('Media')).toBeInTheDocument();
    expect(screen.getByLabelText('Mín.')).toBeInTheDocument();
  });

  it('toggles visibility when checkbox is clicked', () => {
    render(<TemperatureChart datasets={[mockStationData]} />);
    const minCheckbox = screen.getByLabelText('Mín.');
    fireEvent.click(minCheckbox);
    expect(minCheckbox).not.toBeChecked();
  });
});

describe('PrecipitationChart', () => {
  it('renders precipitation bars from single station', () => {
    render(<PrecipitationChart datasets={[mockStationData]} />);
    expect(screen.getByText('Precipitación (mm)')).toBeInTheDocument();
    expect(screen.getByText('Test Station 1')).toBeInTheDocument();
  });

  it('renders grouped bars from both stations for comparison', () => {
    render(<PrecipitationChart datasets={[mockStationData, mockCompareStationData]} />);
    expect(screen.getByText('Precipitación (mm)')).toBeInTheDocument();
    expect(screen.getByText('Test Station 1')).toBeInTheDocument();
    expect(screen.getByText('Test Station 2')).toBeInTheDocument();
  });
});

describe('Weather App', () => {
  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});