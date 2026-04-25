import { render } from '@testing-library/react';
import { TemperatureChart } from '../src/components/TemperatureChart';
import { PrecipitationChart } from '../src/components/PrecipitationChart';
import { StationResponse } from '../src/types';

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

describe('TemperatureChart', () => {
  it('renders component without crashing', () => {
    const { container } = render(<TemperatureChart datasets={[mockStationData]} />);
    expect(container).toBeInTheDocument();
  });

  it('renders comparison chart without crashing', () => {
    const { container } = render(<TemperatureChart datasets={[mockStationData, mockCompareStationData]} />);
    expect(container).toBeInTheDocument();
  });
});

describe('PrecipitationChart', () => {
  it('renders component without crashing', () => {
    const { container } = render(<PrecipitationChart datasets={[mockStationData]} />);
    expect(container).toBeInTheDocument();
  });

  it('renders comparison chart without crashing', () => {
    const { container } = render(<PrecipitationChart datasets={[mockStationData, mockCompareStationData]} />);
    expect(container).toBeInTheDocument();
  });
});