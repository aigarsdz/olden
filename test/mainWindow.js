const Application = require('spectron').Application;
const assert      = require('assert');
const robot       = require('robotjs');

const KEYBOARD_KEYS = {
  arrowDown: '\uE015',
  enter:     '\uE007'
};

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
    robot.keyTap('space', 'alt');

    return this.app.browserWindow.isVisible().then(function(visible) {
      assert.ok(visible);
    });
  });

  it('contains at least one clipboard item when launched', function() {
    return this.app.client.getText('#app > div > div').then(function(clipboardItems) {
      assert.ok(clipboardItems.length > 0);
    });
  });

  it('stores every item added to the clipboard', function() {
    var app = this.app;

    return app.electron.clipboard.writeText('Item 1').pause(1000)
      .electron.clipboard.writeText('Item 2').pause(1000)
      .electron.clipboard.writeText('Item 3').pause(1000)
      .then(function() {
        return app.client.getText('#app > div > div').then(function(clipboardItems) {
          assert.ok(clipboardItems.includes('Item 1'));
          assert.ok(clipboardItems.includes('Item 2'));
          assert.ok(clipboardItems.includes('Item 3'));
        });
      });
  });

  it('allows to navigate between clipboard items', function() {
     var app = this.app;

     return app.client.keys([ KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown ])
      .then(function() {
        return app.client.getHTML('#app > div > div').then(function(clipboardItems) {
          assert.ok(clipboardItems.includes('<div class="selected">Item 2</div>'));
        });
     });
  });

  it('allows to select a clipboard item from the history', function() {
    var app = this.app;

    return app.client.keys([
      KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.enter ]).then(function() {
        return app.electron.clipboard.readText().then(function(clipboardText) {
          assert.equal(clipboardText, 'Item 3');
        });
     });
  });

  it('hides the main window when an item is selected', function() {
    var app = this.app;

    robot.keyTap('space', 'alt');

    return app.client.pause(500).keys([
      KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.enter ]).pause(500)
        .then(function() {
          return app.browserWindow.isVisible().then(function(visible) {
            assert.equal(visible, false);
          });
    });
  });

  it('moves the selected item to the top of the list', function() {
    var app = this.app;

    return app.client.keys([
      KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.enter ]).pause(500)
        .then(function() {
          return app.client.getText('#app > div > div').then(function name(clipboardItems) {
            assert.equal(clipboardItems[0], 'Item 1');
          });
        });
  });
});  