const Application = require('spectron').Application;
const assert      = require('assert');
const robot       = require('robotjs');

const KEYBOARD_KEYS = {
  arrowDown: '\uE015',
  enter:     '\uE007',
  backspace: '\uE003'
};

describe('application launch', function() {
  this.timeout(10000);

  before(function() {
    this.app = new Application({
      path: './node_modules/.bin/electron',
      args: [ 'app' ]
    });

    return this.app.start();
  })

  after(function() {
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
    return this.app.client.getText('#app > div > div.item').then(function(clipboardItems) {
      assert.ok(clipboardItems.length > 0);
    });
  });

  it('stores every item added to the clipboard', function() {
    var app = this.app;

    return app.electron.clipboard.writeText('Text to search').pause(1000)
      .electron.clipboard.writeText('Item 1').pause(1000)
      .electron.clipboard.writeText('Item 2').pause(1000)
      .electron.clipboard.writeText('Item 3').pause(1000)
      .then(function() {
        return app.client.getText('#app > div > div.item').then(function(clipboardItems) {
          assert.ok(clipboardItems.includes('Text to search'));
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
        return app.client.getHTML('#app > div > div.item').then(function(clipboardItems) {
          assert.ok(clipboardItems.includes('<div class="item selected">Item 2</div>'));
        });
     });
  });

  it('allows to select a clipboard item from the history', function() {
    var app = this.app;

    return app.client.keys([ KEYBOARD_KEYS.enter ]).pause(1000).then(function() {
      return app.electron.clipboard.readText().then(function(clipboardText) {
        assert.equal(clipboardText, 'Item 2');
      });
    });
  });

  it('hides the main window when an item is selected', function() {
    var app = this.app;

    robot.keyTap('space', 'alt');

    return app.client.pause(500).keys([
      KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.enter
    ]).pause(1000).then(function() {
      return app.browserWindow.isVisible().then(function(visible) {
        assert.equal(visible, false);
      });
    });
  });

  it('moves the selected item to the top of the list', function() {
    var app = this.app;

    robot.keyTap('space', 'alt');

    return app.client.pause(500).keys([
      KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.arrowDown, KEYBOARD_KEYS.enter
    ]).pause(1000).then(function() {
      return app.client.getText('#app > div > div.item').then(function name(clipboardItems) {
        assert.equal(clipboardItems[0], 'Item 2');
        app.client.pause(1000);
      });
    });
  });

  it('allows to search in clipboard history and displays only the items that match', function() {
    var app = this.app,
        searchText = 'Text to search';

    return app.client.pause(500).keys([ searchText ]).pause(1500).then(function() {
      return app.client.getText('#app > div > div.item').then(function(clipboardItems) {
        assert.equal(clipboardItems.length, 3);
        app.client.pause(500);
      });
    });
  });

  it('allows to delete items from the history', function() {
    var app         = this.app,
        modifierKey = process.platform === 'darwin' ? 'command' : 'control';

    robot.keyTap('space', 'alt');

    return app.client.pause(1000).keys([ KEYBOARD_KEYS.arrowDown ]).then(function() {
      robot.keyTap('backspace', modifierKey);

      return app.client.pause(1000).keys([ KEYBOARD_KEYS.arrowDown ]).then(function() {
        robot.keyTap('backspace', modifierKey);

        return app.client.pause(1000).keys([ KEYBOARD_KEYS.arrowDown ]).then(function() {
          robot.keyTap('backspace', modifierKey);

          return app.client.pause(1000).keys([ KEYBOARD_KEYS.arrowDown ]).then(function() {
            robot.keyTap('backspace', modifierKey);

            return app.client.pause(1000).getText('#app > div > div.item').then(function(clipboardItems) {
              assert.ok(!clipboardItems.includes('Item 1'));
              assert.ok(!clipboardItems.includes('Item 2'));
              assert.ok(!clipboardItems.includes('Item 3'));
              assert.ok(!clipboardItems.includes('Text to search'));
            });
          });
        });
      });
    });
  });
});  