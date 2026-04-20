import { handler } from '../src/index';

jest.mock('../src/dynamodb/client', () => ({
  scanAllStations: jest.fn(),
  queryStationData: jest.fn(),
}));

import { scanAllStations, queryStationData } from '../src/dynamodb/client';

const mockScanAllStations = scanAllStations as jest.MockedFunction<typeof scanAllStations>;
const mockQueryStationData = queryStationData as jest.MockedFunction<typeof queryStationData>;

const mockRequestContext = {
  accountId: '123456789012',
  apiId: 'test-api',
  domainName: 'test.execute-api.us-east-1.amazonaws.com',
  requestId: 'test-request-id',
};

describe('Weather API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /stations', () => {
    it('should return list of stations', async () => {
      mockScanAllStations.mockResolvedValue([
        { stationId: 'c20m236e01', stationName: 'Sumacàrcer', territory: 'c20', territoryName: 'Ribera Alta' },
        { stationId: 'c20m236e02', stationName: 'Sumacàrcer (Alt)', territory: 'c20', territoryName: 'Ribera Alta' },
      ]);

      const response = await handler({
        rawPath: '/stations',
        queryStringParameters: null,
        requestContext: mockRequestContext,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['Cache-Control']).toBe('public, max-age=21600');
      
      const body = JSON.parse(response.body);
      expect(body.stations).toHaveLength(2);
      expect(body.stations[0].id).toBe('c20m236e01');
    });

    it('should return 500 on error', async () => {
      mockScanAllStations.mockRejectedValue(new Error('DynamoDB error'));

      const response = await handler({
        rawPath: '/stations',
        queryStringParameters: null,
        requestContext: mockRequestContext,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /stations/:stationId', () => {
    it('should return station data for given days', async () => {
      mockQueryStationData.mockResolvedValue([
        { pk: 'c20#2026-04-16', sk: 'c20m236e01', territory: 'c20', territoryName: 'Ribera Alta', location: 'test', date: '2026-04-16', stationId: 'c20m236e01', stationName: 'Sumacàrcer', tempMax: 27.2, tempMin: 12.2, tempAvg: 19.4, precipitation: 0 },
      ]);

      const response = await handler({
        rawPath: '/stations/c20m236e01',
        queryStringParameters: { days: '7' },
        requestContext: mockRequestContext,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['Cache-Control']).toBe('public, max-age=7200');
      
      const body = JSON.parse(response.body);
      expect(body.stationId).toBe('c20m236e01');
      expect(body.data).toHaveLength(1);
    });

    it('should return 404 when station not found', async () => {
      mockQueryStationData.mockResolvedValue([]);

      const response = await handler({
        rawPath: '/stations/c20m236e01',
        queryStringParameters: { days: '7' },
        requestContext: mockRequestContext,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should default to 7 days when days not specified', async () => {
      mockQueryStationData.mockResolvedValue([]);

      await handler({
        rawPath: '/stations/c20m236e01',
        queryStringParameters: null,
        requestContext: mockRequestContext,
      });

      expect(mockQueryStationData).toHaveBeenCalledWith('c20m236e01', 7);
    });
  });

  describe('404 for unknown paths', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await handler({
        rawPath: '/unknown',
        queryStringParameters: null,
        requestContext: mockRequestContext,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});