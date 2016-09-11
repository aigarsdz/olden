const packager    = require('electron-packager');
const appdmg      = require('appdmg');
const rimraf      = require('rimraf');
const path        = require('path');
const packageInfo = require(path.join(__dirname, '..', 'package.json'));

packager({
  dir:      path.join(__dirname, '..', 'app'),
  arch:     'all',
  icon:     path.join(__dirname, '..', 'assets', 'app_icon.icns'),
  ignore:   '.DS_Store',
  out:      path.join(__dirname, '..', 'dist'),
  platform: 'darwin',
  version:  '1.3.5'
}, function(err, appPaths) {
  if (err) {
    console.log(err);
  } else {
    if (appPaths.length > 0) {
      console.log('The following app bundles were created:\n\n');
      appPaths.forEach((path) => console.log(`\t${path}`));
      console.log();
    }

    dmgCreator = appdmg({
      source: path.join(__dirname, '..', 'appdmg.json'),
      target: path.join(__dirname, '..', 'dist', `Olden-${packageInfo.version}.dmg`)
    });

    dmgCreator.on('progress', (info) => {
      if (info.type === 'step-begin') {
        const line = `[ ${info.current}/${info.total} ] ${info.title}...`;

        process.stdout.write(line + ' '.repeat(45 - line.length));
      }

      if (info.type === 'step-end') {
        process.stdout.write(`[ ${info.status} ]\n`);
      }
    });

    dmgCreator.on('finish', () => {
      console.log(`\nPackage created in dist/Olden-${packageInfo.version}.dmg\n`);
      appPaths.forEach((path) => rimraf(path, () => {}));
    });

    dmgCreator.on('error', (err) => {
      console.log(`\n${err}\n`);
    });
  }
});