import { getYesterdayDate } from '@weather-history/shared-types';
import { checkRecordExists } from './dynamodb/client';
import { sendMissingDataEmail } from './ses/client';

export interface CheckerEvent {
  stationIds: string[];
}

export const handler = async (event: CheckerEvent): Promise<void> => {
  console.log('Checker event received:', JSON.stringify(event));

  const { stationIds } = event;
  const date = getYesterdayDate();

  console.log(`Checking data for date: ${date}`);
  console.log(`Total stations to check: ${stationIds.length}`);

  const missingStations: string[] = [];

  for (const stationId of stationIds) {
    const pk = `${stationId.substring(0, 3)}#${date}`;
    const exists = await checkRecordExists(pk, stationId);

    if (exists) {
      console.log(`Station ${stationId}: data present`);
    } else {
      console.log(`Station ${stationId}: data MISSING`);
      missingStations.push(stationId);
    }
  }

  if (missingStations.length === 0) {
    console.log('All data is present. No action required.');
    return;
  }

  console.log(`Missing data for ${missingStations.length} stations. Sending notification...`);
  await sendMissingDataEmail(missingStations, date);
  console.log('Notification sent successfully.');
};

export { checkRecordExists } from './dynamodb/client';
export { sendMissingDataEmail } from './ses/client';