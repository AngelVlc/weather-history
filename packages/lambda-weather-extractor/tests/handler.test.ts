import { handler, getYesterdayDate, getDateFromString } from '../src/handler';
import * as httpClient from '../src/httpClient';
import * as parser from '../src/parser/htmlParser';
import * as dynamoDB from '../src/dynamodb/client';

jest.mock('../src/httpClient');
jest.mock('../src/parser/htmlParser');
jest.mock('../src/dynamodb/client');

describe('Weather Extractor Lambda - Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvent = {
    territory: 'c20',
    territoryName: 'Castellón',
    location: 'test-location',
    stationIds: ['c20m001e01', 'c20m002e01'],
  };

  describe('handler', () => {
    it('should fetch, parse and save weather data for matching stations', async () => {
      const mockHtml = '<table>...</table>';
      const mockParsedData = [
        {
          stationId: 'c20m001e01',
          stationName: 'Station 1',
          tempMin: 10,
          tempMax: 20,
          tempAvg: 15,
          precipitation: 5,
        },
        {
          stationId: 'c20m002e01',
          stationName: 'Station 2',
          tempMin: 12,
          tempMax: 22,
          tempAvg: 17,
          precipitation: 0,
        },
        {
          stationId: 'c20m003e01',
          stationName: 'Station 3',
          tempMin: 8,
          tempMax: 18,
          tempAvg: 13,
          precipitation: 2,
        },
      ];

      const fetchWeatherPageSpy = jest
        .spyOn(httpClient, 'fetchWeatherPage')
        .mockResolvedValue(mockHtml);
      const parseWeatherTableSpy = jest
        .spyOn(parser, 'parseWeatherTable')
        .mockReturnValue(mockParsedData);
      const saveWeatherRecordsSpy = jest
        .spyOn(dynamoDB, 'saveWeatherRecords')
        .mockResolvedValue();

      await handler(mockEvent as any);

      expect(fetchWeatherPageSpy).toHaveBeenCalledWith('c20', expect.any(String));
      expect(parseWeatherTableSpy).toHaveBeenCalledWith(mockHtml, 'c20', expect.any(String));
      expect(saveWeatherRecordsSpy).toHaveBeenCalledTimes(1);
      expect(saveWeatherRecordsSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            stationId: 'c20m001e01',
            territory: 'c20',
            territoryName: 'Castellón',
            location: 'test-location',
          }),
          expect.objectContaining({
            stationId: 'c20m002e01',
          }),
        ])
      );
    });

    it('should not save records when no stations match filter', async () => {
      const mockHtml = '<table>...</table>';
      const mockParsedData = [
        {
          stationId: 'c20m003e01',
          stationName: 'Station 3',
          tempMin: 8,
          tempMax: 18,
          tempAvg: 13,
          precipitation: 2,
        },
      ];

      jest
        .spyOn(httpClient, 'fetchWeatherPage')
        .mockResolvedValue(mockHtml);
      jest
        .spyOn(parser, 'parseWeatherTable')
        .mockReturnValue(mockParsedData);
      const saveWeatherRecordsSpy = jest
        .spyOn(dynamoDB, 'saveWeatherRecords')
        .mockResolvedValue();

      await handler(mockEvent as any);

      expect(saveWeatherRecordsSpy).not.toHaveBeenCalled();
    });

    it('should handle empty parsed data', async () => {
      jest
        .spyOn(httpClient, 'fetchWeatherPage')
        .mockResolvedValue('<table></table>');
      jest
        .spyOn(parser, 'parseWeatherTable')
        .mockReturnValue([]);
      const saveWeatherRecordsSpy = jest
        .spyOn(dynamoDB, 'saveWeatherRecords')
        .mockResolvedValue();

      await handler(mockEvent as any);

      expect(saveWeatherRecordsSpy).not.toHaveBeenCalled();
    });

    it('should throw when fetchWeatherPage fails', async () => {
      jest
        .spyOn(httpClient, 'fetchWeatherPage')
        .mockRejectedValue(new Error('Network error'));

      await expect(handler(mockEvent as any)).rejects.toThrow('Network error');
    });
  });

  describe('getYesterdayDate', () => {
    it('should return yesterday date in YYYY-MM-DD format', () => {
      const result = getYesterdayDate();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expected = yesterday.toISOString().split('T')[0];

      expect(result).toBe(expected);
    });
  });

  describe('getDateFromString', () => {
    it('should extract date portion from ISO string', () => {
      expect(getDateFromString('2026-04-14T10:30:00.000Z')).toBe('2026-04-14');
    });

    it('should return input if already just date', () => {
      expect(getDateFromString('2026-04-14')).toBe('2026-04-14');
    });
  });
});
