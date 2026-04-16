import { SQSEvent, Context } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION });
const SOURCE_EMAIL = 'noreply@avametdata.es';

export const handler = async (event: SQSEvent, _context: Context): Promise<void> => {
  console.log('Processing DLQ messages:', event.Records.length);

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      let eventData: Record<string, unknown>;

      if (body.Message) {
        eventData = JSON.parse(body.Message);
      } else {
        eventData = body;
      }

      const emailContent = formatEmail(eventData);

      await sendEmail(emailContent);

      console.log('Email sent for territory:', eventData.territory);
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
};

function formatEmail(eventData: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();

  return `
Weather Extraction Failed - Retry Limit Reached

Timestamp: ${timestamp}

Event Data:
${JSON.stringify(eventData, null, 2)}

---
This is an automated message from weather-history Lambda.
The message remains in the DLQ for investigation and redrive.
  `.trim();
}

async function sendEmail(content: string): Promise<void> {
  const destinationEmail = process.env.NOTIFICATION_EMAIL;

  if (!destinationEmail) {
    console.error('NOTIFICATION_EMAIL environment variable not set');
    throw new Error('NOTIFICATION_EMAIL not configured');
  }

  const command = new SendEmailCommand({
    Source: SOURCE_EMAIL,
    Destination: {
      ToAddresses: [destinationEmail],
    },
    Message: {
      Subject: {
        Data: '[weather-history] Lambda Failed - Action Required',
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: content,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}
