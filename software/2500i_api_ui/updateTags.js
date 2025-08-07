const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConnect = require('./lib/db/dbConnect'); // Database connection

const dataFiles = [
  { name: 'settingsData', path: './lib/data/settingsData.js' },
  { name: 'keypadData', path: './lib/data/keypadData.js' },
  { name: 'homeData', path: './lib/data/homeData.js' },
  { name: 'diagnosticsData', path: './lib/data/diagnosticsData.js' },
];

async function updateTags() {
  try {
    await dbConnect.query('SELECT NOW()'); // Check database connection
    console.log('✅ Database connected successfully.');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
    return;
  }

  for (const { name, path: filePath } of dataFiles) {
    console.log(`Processing ${name}...`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8'); // Read original content

      // Find the `data` array using regex
      const dataRegex = /const data = (\[[\s\S]*?\]);/;
      const match = originalContent.match(dataRegex);

      if (!match) {
        console.error(`❌ Data array not found in ${name}. Skipping.`);
        continue;
      }

      const originalData = eval(match[1]); // Safely evaluate the array
      let updatedDataArray = [];

      // Process each item in the data array
      for (const item of originalData) {
        const { sztag, channum, table } = item;

        try {
          const query = `SELECT sztag FROM ${table} WHERE channum = $1;`;
          const { rows, rowCount } = await dbConnect.query(query, [channum]);

          if (rowCount === 0) {
            console.log(
              `❌ Removing channum ${channum} - not found in ${table}.`
            );
            continue; // Skip if not found in DB
          }

          const { sztag: correctTag } = rows[0];

          if (sztag !== correctTag) {
            console.log(
              `⚠️ Updating sztag for channum ${channum}: ${sztag} -> ${correctTag}`
            );
            item.sztag = correctTag; // Update the sztag
          }

          updatedDataArray.push(item); // Keep valid items
        } catch (error) {
          console.error(`❌ Error querying channum ${channum}:`, error.message);
        }
      }

      // Generate the updated data array string
      const newDataString = JSON.stringify(updatedDataArray, null, 2)
        .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
        .replace(/"([^"]+)"/g, "'$1'"); // Use single quotes

      // Replace the old data array with the new one in the original content
      const newContent = originalContent.replace(
        dataRegex,
        `const data = ${newDataString};`
      );

      fs.writeFileSync(filePath, newContent, 'utf-8'); // Write the updated content back

      console.log(`✅ Updated ${name} successfully.`);
    } catch (error) {
      console.error(`❌ Error processing ${name}:`, error.message);
    }
  }

  await dbConnect.pool.end(); // Close the database pool
  console.log('✅ Database pool closed. All files updated successfully!');
}

// Run the update
updateTags().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
});
