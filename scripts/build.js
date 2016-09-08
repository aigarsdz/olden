const fs          = require('fs');
const path        = require('path');
const packageInfo = require(path.join(__dirname, '..', 'package.json'));

fs.createReadStream(path.join(__dirname, '..', 'bower_components', 'vue', 'dist', 'vue.min.js'))
  .pipe(fs.createWriteStream(path.join(__dirname, '..', 'app', 'js', 'vue.min.js')));

packageInfo.main = './main.js';
packageInfo.scripts.start = 'electron .';

delete packageInfo.scripts.build;

fs.writeFile(path.join(__dirname, '..', 'app', 'package.json'), JSON.stringify(packageInfo));