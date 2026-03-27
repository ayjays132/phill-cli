const fs = require('fs');
const glob = require('glob');

const newVersion = '0.0.1';
const files = glob.sync('**/package.json', { ignore: ['**/node_modules/**'] });

files.forEach(file => {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.version) {
      pkg.version = newVersion;
      // Also update workspace dependency versions if they use absolute versions
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(dep => {
          if (dep.startsWith('phill-cli') || dep === '@ayjays132/phill-cli') {
            pkg.dependencies[dep] = newVersion;
          }
        });
      }
      if (pkg.config && pkg.config.sandboxImageUri) {
         pkg.config.sandboxImageUri = pkg.config.sandboxImageUri.replace(/:.*$/, `:${newVersion}`);
      }
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Updated ${file}`);
    }
  } catch (e) {
    // Ignore invalid JSONs
  }
});
