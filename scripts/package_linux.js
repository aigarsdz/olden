const packager    = require('electron-packager');
const archiver    = require('archiver');
const rimraf      = require('rimraf');
const path        = require('path');
const fs          = require('fs');
const packageInfo = require(path.join(__dirname, '..', 'package.json'));

packager({
  dir:      path.join(__dirname, '..', 'app'),
  arch:     'all',
  icon:     path.join(__dirname, '..', 'assets', 'app_icon.ico'),
  ignore:   '.DS_Store',
  out:      path.join(__dirname, '..', 'dist'),
  platform: 'linux',
  version:  '1.4.13',
  asar:     true,
  name:     'Olden'
}, function(err, appPaths) {
  if (err) {
    console.log(err);
  } else {
    if (appPaths.length > 0) {
      console.log('The following app bundles were created:\n');
      appPaths.forEach((p) => console.log(`\t${p}`));
      console.log();

      appPaths.forEach((p) => {
        const pathParts   = p.split('/'),
              packageName = pathParts[pathParts.length - 1],
              output      = fs.createWriteStream(path.join(
                __dirname, '..', 'dist', `${packageName}-${packageInfo.version}.zip`)),
              archive     = archiver('zip');

        output.on('close', function() {
          console.log(`Package created in dist/${packageName}-${packageInfo.version}.zip`);
          rimraf(p, () => {});
        });

        archive.on('error', function(err) {
          console.log(`\n${err}\n`);
        });

        archive.pipe(output);

        archive.bulk([
          { expand: true, cwd: p, src: ['**/*'] }
        ]);

        archive.finalize();
      });
    }
  }
});