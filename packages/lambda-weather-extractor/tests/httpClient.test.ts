import axios from 'axios';
import { fetchWeatherPage } from '../src/httpClient';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HTTP Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWeatherPage', () => {
    it('should fetch HTML from AVAMET with correct parameters', async () => {
      const mockHtml = '<html><table>...</table></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetchWeatherPage('c20', '2026-04-14');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.avamet.org/mx-meteoxarxa.php?territori=c20&data=2026-04-14',
        {
          headers: { 'Accept': 'text/html' },
          timeout: 10000,
        }
      );
      expect(result).toBe(mockHtml);
    });

    it('should throw error on network failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection timeout'));

      await expect(fetchWeatherPage('c20', '2026-04-14')).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should use correct base URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<html></html>' });

      await fetchWeatherPage('c20', '2026-04-14');

      const calledUrl = mockedAxios.get.mock.calls[0][0];
      expect(calledUrl).toContain('www.avamet.org/mx-meteoxarxa.php');
    });
  });
});