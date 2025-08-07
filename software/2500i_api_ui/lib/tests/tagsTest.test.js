const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbConnect = require('../db/dbConnect');

// Import all data files
const { data: settingsData } = require('../data/settingsData');
const { data: keypadData } = require('../data/keypadData');
const { data: homeData } = require('../data/homeData');
const { data: diagnosticsData } = require('../data/diagnosticsData');

// Combine all data sources into an array
const allDataFiles = [
  { name: 'Settings Data', data: settingsData },
  { name: 'Keypad Data', data: keypadData },
  { name: 'Home Data', data: homeData },
  { name: 'Diagnostics Data', data: diagnosticsData },
];

describe('All Data Files Tags Test', () => {
  it('should validate tags across all data files', async () => {
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    const summary = {
      notFoundEntries: [], // Store missing channels
      mismatchEntries: [], // Store mismatches
      totalChecked: 0,
    };

    // Iterate over all data files
    for (const { name: fileName, data } of allDataFiles) {
      console.log(`Processing ${fileName}...`);

      summary.totalChecked += data.length; // Increment total checked count

      // Validate each entry in the current data file
      for (const item of data) {
        const { name, sztag, channum, table } = item;

        try {
          const query = `SELECT channum, sztag FROM ${table} WHERE channum = $1;`;
          const { rows, rowCount } = await dbConnect.query(query, [channum]);

          if (rowCount === 0) {
            summary.notFoundEntries.push({ fileName, channum, name, table });
            notFoundCount++;
          } else {
            const { sztag: existingSztag } = rows[0];

            if (existingSztag !== sztag) {
              summary.mismatchEntries.push({
                fileName,
                channum,
                name,
                expectedTag: sztag,
                foundTag: existingSztag,
                table,
              });
              mismatchCount++;
            } else {
              matchCount++;
            }
          }
        } catch (error) {
          console.error(
            `❌ Query failed for ${name} (Channel: ${channum}) in ${table}:`,
            error
          );
          throw error;
        }
      }
    }

    // Add counts to the summary object
    summary.matches = matchCount;
    summary.mismatches = mismatchCount;
    summary.notFound = notFoundCount;

    // Display the structured summary using console.table
    console.log('--- Test Summary ---');

    if (summary.mismatchEntries.length > 0) {
      console.table(summary.mismatchEntries, [
        'fileName',
        'channum',
        'name',
        'expectedTag',
        'foundTag',
        'table',
      ]);
    }

    if (summary.notFoundEntries.length > 0) {
      console.table(summary.notFoundEntries, [
        'fileName',
        'channum',
        'name',
        'table',
      ]);
    }

    console.table([
      {
        TotalChecked: summary.totalChecked,
        Matches: summary.matches,
        Mismatches: summary.mismatches,
        NotFound: summary.notFound,
      },
    ]);

    // Ensure the test only passes if there are no mismatches or missing entries
    expect(mismatchCount + notFoundCount).toBe(0);
  });

  // Close the pool after all tests without logging anything
  afterAll(async () => {
    await dbConnect.pool.end(); // Clean up without console.log
  });
});
