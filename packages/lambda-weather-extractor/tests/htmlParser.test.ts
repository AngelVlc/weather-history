import { parseWeatherTable } from '../src/parser/htmlParser';

describe('HTML Parser', () => {
  it('should parse weather table from AVAMET HTML', () => {
    const html = `
      <table class="tDades">
        <tr>
          <td class="rEsta">
            <a class="negre" href="mx-fitxa.php?id=c20m123e01">
              Station Name
            </a>
          </td>
          <td class="rValm">10,5</td>
          <td class="rValm">15,2</td>
          <td class="rValm">22,3</td>
          <td class="rVal">56</td>
          <td class="rValm colorP">5,2</td>
        </tr>
      </table>
    `;

    const result = parseWeatherTable(html, 'c20', '2026-04-14');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      stationId: 'c20m123e01',
      stationName: 'Station Name',
      tempMin: 10.5,
      tempAvg: 15.2,
      tempMax: 22.3,
      precipitation: 5.2,
    });
  });

  it('should parse multiple stations', () => {
    const html = `
      <table class="tDades">
        <tr>
          <td class="rEsta">
            <a href="mx-fitxa.php?id=c20m001e01">Station 1</a>
          </td>
          <td class="rValm">10,0</td>
          <td class="rValm">15,0</td>
          <td class="rValm">20,0</td>
          <td class="rVal">50</td>
          <td class="rValm colorP">1,0</td>
        </tr>
        <tr>
          <td class="rEsta">
            <a href="mx-fitxa.php?id=c20m002e01">Station 2</a>
          </td>
          <td class="rValm">12,0</td>
          <td class="rValm">18,0</td>
          <td class="rValm">25,0</td>
          <td class="rVal">45</td>
          <td class="rValm colorP">0,0</td>
        </tr>
      </table>
    `;

    const result = parseWeatherTable(html, 'c20', '2026-04-14');

    expect(result).toHaveLength(2);
    expect(result[0].stationId).toBe('c20m001e01');
    expect(result[1].stationId).toBe('c20m002e01');
  });

  it('should skip rows without valid station ID', () => {
    const html = `
      <table class="tDades">
        <tr>
          <td class="rProvincia">Some Province</td>
        </tr>
        <tr>
          <td class="rEsta">
            <a href="mx-fitxa.php?id=c20m001e01">Valid Station</a>
          </td>
          <td class="rValm">10,0</td>
          <td class="rValm">15,0</td>
          <td class="rValm">20,0</td>
          <td class="rVal">50</td>
          <td class="rValm colorP">1,0</td>
        </tr>
      </table>
    `;

    const result = parseWeatherTable(html, 'c20', '2026-04-14');

    expect(result).toHaveLength(1);
    expect(result[0].stationId).toBe('c20m001e01');
  });

  it('should handle empty precipitation as zero', () => {
    const html = `
      <table class="tDades">
        <tr>
          <td class="rEsta">
            <a href="mx-fitxa.php?id=c20m001e01">Station</a>
          </td>
          <td class="rValm">10,0</td>
          <td class="rValm">15,0</td>
          <td class="rValm">20,0</td>
          <td class="rVal">50</td>
          <td class="rValm colorP"></td>
        </tr>
      </table>
    `;

    const result = parseWeatherTable(html, 'c20', '2026-04-14');

    expect(result[0].precipitation).toBe(0);
  });
});
