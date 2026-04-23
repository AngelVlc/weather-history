jest.mock('../src/dynamodb/client');
jest.mock('../src/ses/client');

import { handler, getYesterdayDate } from '../src/handler';
import { checkRecordExists } from '../src/dynamodb/client';
import { sendMissingDataEmail } from '../src/ses/client';

const mockCheckRecordExists = checkRecordExists as jest.Mock;
const mockSendMissingDataEmail = sendMissingDataEmail as jest.Mock;

describe('Weather Checker Lambda - Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should not send email when all data is present', async () => {
      mockCheckRecordExists.mockResolvedValue(true);
      mockSendMissingDataEmail.mockResolvedValue(undefined);

      const event = {
        stationIds: ['c20m236e01', 'c20m236e02'],
      };

      await handler(event as any);

      expect(mockCheckRecordExists).toHaveBeenCalledTimes(2);
      expect(mockSendMissingDataEmail).not.toHaveBeenCalled();
    });

    it('should send email when some data is missing', async () => {
      mockCheckRecordExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockSendMissingDataEmail.mockResolvedValue(undefined);

      const event = {
        stationIds: ['c20m236e01', 'c20m236e02'],
      };

      await handler(event as any);

      expect(mockCheckRecordExists).toHaveBeenCalledTimes(2);
      expect(mockSendMissingDataEmail).toHaveBeenCalledTimes(1);
      expect(mockSendMissingDataEmail).toHaveBeenCalledWith(
        ['c20m236e02'],
        expect.any(String)
      );
    });

    it('should send email with all missing stations', async () => {
      mockCheckRecordExists.mockResolvedValue(false);
      mockSendMissingDataEmail.mockResolvedValue(undefined);

      const event = {
        stationIds: ['c20m236e01', 'c15m250e34', 'c21m235e02'],
      };

      await handler(event as any);

      expect(mockSendMissingDataEmail).toHaveBeenCalledWith(
        ['c20m236e01', 'c15m250e34', 'c21m235e02'],
        expect.any(String)
      );
    });

    it('should not send email when no stations provided', async () => {
      const event = {
        stationIds: [],
      };

      await handler(event as any);

      expect(mockCheckRecordExists).not.toHaveBeenCalled();
      expect(mockSendMissingDataEmail).not.toHaveBeenCalled();
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
});