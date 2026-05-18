const fs = require('fs');
const path = require('path');

// Percorsi dei file
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionJsonPath = path.join(__dirname, '..', 'src', 'version.json');

try {
  // Leggi package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  
  // Crea l'oggetto versione
  const versionData = {
    version: version,
    buildDate: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  };

  // Scrivi il file src/version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  
  console.log(`✅ Version updated to ${version} (Build Date: ${versionData.buildDate})`);
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}
