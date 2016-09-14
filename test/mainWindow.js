const Application = require('spectron').Application;
const assert = require('assert');

describe('application launch', function () {
  this.timeout(10000);

  beforeEach(function () {
    this.app = new Application({
      path: './node_modules/.bin/electron',
      args: [ 'app' ]
    });

    return this.app.start();
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  it('opens the main window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 1);
    });
  });
});