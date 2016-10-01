const Application = require('spectron').Application;
const assert      = require('assert');

describe('application launch', function() {
  this.timeout(10000);

  beforeEach(function() {
    this.app = new Application({
      path: './node_modules/.bin/electron',
      args: [ 'app' ]
    });

    return this.app.start();
  })

  afterEach(function() {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  it('opens the main window', function() {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 1);
    });
  });

  it('hides the main window on startup', function() {
    return this.app.browserWindow.isVisible().then(function(visible) {
      assert.equal(visible, false);
    });
  });

  it('shows the main window when alt+space shortcut is executed', function() {
    var app = this.app;

    return app.client.keys([ 'AltLeft', 'Space' ]).then(function() {
      app.browserWindow.isVisible().then(function(visible) {
        assert.ok(visible);
      });
    });
  });

  it('contains at least one clipboard item when launched', function() {
    return this.app.client.getText('#app > div > div').then(function(clipboardItems) {
      assert.ok(clipboardItems.length > 0);
    });
  });

  it('stores every item added to the clipboard', function() {
    var app = this.app;

    return app.electron.clipboard.writeText('Item 1')
      .electron.clipboard.writeText('Item 2')
      .electron.clipboard.writeText('Item 3')
      .then(function(clipboardText) {
        app.client.getText('#app > div > div').then(function(clipboardItems) {
          assert.ok(clipboardItems.includes('Item 1'));
          assert.ok(clipboardItems.includes('Item 2'));
          assert.ok(clipboardItems.includes('Item 3'));
        });
      });
  });

  it('allows to navigate between clipboard items', function() {
     var app = this.app;

     return app.client.keys([ 'ArrowDown', 'ArrowDown' ]).then(function() {
       app.client.getHTML('#app > div > div').then(function(clipboardItems) {
         assert.equal(clipboardItems[2], '<div class="selected">Item 1</div>');
       });
     });
  });

  it('allows to select a clipboard item from the history', function() {
    var app = this.app;

    return app.client.keys([ 'ArrowDown', 'ArrowDown', 'Enter' ]).then(function() {
       app.electron.clipboard.readText().then(function(clipboardText) {
         assert.equal(clipboardText, 'Item 1');
       });
     });
  });
});