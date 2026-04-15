import axios from 'axios';

const BASE_URL = 'https://www.avamet.org/mx-meteoxarxa.php';

export async function fetchWeatherPage(
  territory: string,
  date: string
): Promise<string> {
  const url = `${BASE_URL}?territori=${territory}&data=${date}`;

  const response = await axios.get(url, {
    headers: {
      'Accept': 'text/html',
    },
    timeout: 10000,
  });

  return response.data as string;
}
