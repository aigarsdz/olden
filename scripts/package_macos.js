const packager    = require('electron-packager');
const appdmg      = require('appdmg');
const rimraf      = require('rimraf');
const path        = require('path');
const exec        = require('child_process').exec;
const packageInfo = require(path.join(__dirname, '..', 'package.json'));

if (process.platform === 'darwin') {
  packager({
    dir:      path.join(__dirname, '..', 'app'),
    arch:     'all',
    icon:     path.join(__dirname, '..', 'assets', 'app_icon.icns'),
    ignore:   '.DS_Store',
    out:      path.join(__dirname, '..', 'dist'),
    platform: 'darwin',
    version:  '1.4.1',
    asar:     true,
    name:     'Olden'
  }, function(err, appPaths) {
    if (err) {
      console.log(err);
    } else {
      if (appPaths.length > 0) {
        console.log('The following app bundles were created:\n\n');
        appPaths.forEach((path) => console.log(`\t${path}`));
        console.log();

        if (process.env.CODE_SIGNING_AUTHORITY) {
          appPaths.forEach((p) => {
            exec("codesign --deep --force --verbose --sign '" +
              process.env.CODE_SIGNING_AUTHORITY + "' " + p + "/Olden.app", (err, stdout, stderr) => {
                if (err) {
                  console.log(stderr);
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
                  appPaths.forEach((p) => rimraf(p, () => {}));
                });

                dmgCreator.on('error', (err) => {
                  console.log(`\n${err}\n`);
                });
              });
          });
        }
      }
    }
  });
} else {
  console.log("MacOS packages can only be built on MacOS");
}