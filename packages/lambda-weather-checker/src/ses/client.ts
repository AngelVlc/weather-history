import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

export async function sendMissingDataEmail(
  missingStations: string[],
  date: string
): Promise<void> {
  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!toEmail) {
    throw new Error('NOTIFICATION_EMAIL environment variable is not set');
  }

  const subject = `Weather Data Check - Missing data for ${date}`;

  const body = missingStations.length === 1
    ? `The following station is missing data for ${date}:\n\n${missingStations.join('\n')}`
    : `The following stations are missing data for ${date}:\n\n${missingStations.map(s => `- ${s}`).join('\n')}`;

  const command = new SendEmailCommand({
    Source: toEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: body,
        },
      },
    },
  });

  await sesClient.send(command);
  console.log(`Notification email sent to ${toEmail}`);
}