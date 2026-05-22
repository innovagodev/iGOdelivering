const fs = require('fs');
const path = require('path');

// Percorsi dei file
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionJsonPath = path.join(__dirname, '..', 'src', 'version.json');

try {
  // Leggi package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  
  let buildDate = new Date().toISOString();
  let env = process.env.NODE_ENV || 'development';

  // Verifica se stiamo eseguendo una vera release
  const isRelease = process.argv.includes('--release') || process.env.npm_lifecycle_event === 'postbump';

  if (!isRelease && fs.existsSync(versionJsonPath)) {
    try {
      const existingVersion = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      if (existingVersion.buildDate) {
        buildDate = existingVersion.buildDate;
      }
      if (existingVersion.env) {
        env = existingVersion.env;
      }
    } catch (e) {
      console.warn('⚠️ Warning: Impossibile leggere il file version.json esistente, ne verrà generato uno nuovo.');
    }
  }

  // Crea l'oggetto versione
  const versionData = {
    version: version,
    buildDate: buildDate,
    env: env
  };

  // Scrivi il file src/version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  
  console.log(`✅ Version updated to ${version} (Build Date: ${versionData.buildDate}, Mode: ${isRelease ? 'Release' : 'Preserved'})`);
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}
