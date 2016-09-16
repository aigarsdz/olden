const {ipcRenderer, clipboard} = require('electron');
const path                     = require('path');
const packageInfo              = require(path.join(__dirname, 'package.json'));

const KEY_DEL   = 8;
const KEY_ENTER = 13;
const KEY_ESC   = 27;
const KEY_LEFT  = 37;
const KEY_UP    = 38;
const KEY_RIGHT = 39;
const KEY_DOWN  = 40;

const Dexie = require('dexie');
const db = new Dexie('clipboard');
const keyActionMap = {};

db.version(1).stores({
  items: '++id, &text, favorite'
});

keyActionMap[KEY_DEL]   = 'deleteItem';
keyActionMap[KEY_ENTER] = 'copyItem';
keyActionMap[KEY_ESC]   = 'hideWindow';
keyActionMap[KEY_LEFT]  = 'openPreviousPage';
keyActionMap[KEY_UP]    = 'selectPrevious';
keyActionMap[KEY_RIGHT] = 'openNextPage';
keyActionMap[KEY_DOWN]  = 'selectNext';

const vm = new Vue({
  el: '#app',

  data: {
    clipboardContent:   [],
    searchResults:      [],
    lastClipboardItem:  '',
    clipboardItemCount: 0,
    searchItemCount:    0,
    selectionIndex:     -1,
    query:              '',
    currentPage:        0,
    currentSearchPage:  0
  },

  methods: {

    /**
     * Loads clipboard data from the database in reverse order sorted by id and
     * adds the results to clipboardContent. Only 9 items per page
     * are loaded. The offset is calculated using currentPage.
     *
     * @param {Function} callback Any action that needs to be executed after
     *                            the data is loaded.
     *
     * @param {Boolean} setLastItem Optional. Set to true only on initial load
     *                              to set lastClipboardItem to the last
     *                              value in user's clipboard. It is used to
     *                              determine if the clipboard has chnaged.
     *                              The default is true.
     */
    loadClipboard(callback, setLastItem) {
      setLastItem = setLastItem || false;

      // NOTE: favorites aren't used for now.
      db.items
        .where('favorite').equals(1)
        .reverse()
        .offset(9 * this.currentPage)
        .limit(9)
        .sortBy('id')
        .then((favorites) => {
          this.favorites = favorites;
        });

      db.items
        .where('favorite').equals(0)
        .reverse()
        .offset(9 * this.currentPage)
        .limit(9)
        .sortBy('id')
        .then((items) => {
          // NOTE: until favorites are fully implemented we can store only
          // text values in the clipboard.
          this.clipboardContent = items.map((item) => item.text);

          // Store the last value from the clipboard to check if it has changed.
          if (items.length > 0 && setLastItem) {
            this.lastClipboardItem = items[0].text;
          }
        }).then(callback);
    },

    /**
     * Navigates between pages. It basically just sets currentPage to the
     * given index (0 for the first page, 1 - the second etc.) and  relaods
     * the clipboard.
     *
     * @param {Number} pageIndex
     * @param {Function} callback
     *
     * @see {@link loadClipboard}
     */
    openPage(pageIndex, callback) {
      this.currentPage = pageIndex;

      this.loadClipboard(callback);
    },

    deleteItem() {
      // TODO: implement delete functionality for a single item.
    },

    /**
     * Takes an item from the clipboard collection and moves it to the top of
     * the list.
     */
    copyItem() {
      const collection    = this.query.length === 0 ? 'clipboardContent' : 'searchResults';
      const clipboardItem = this[collection].splice(this.selectionIndex, 1)[0];

      db.items
        .where('text').equals(clipboardItem)
        .delete()
        .then((count) => {
          this.clipboardItemCount -= count;

          // Navigate back to the first page because the selected item is now
          // at the very top of the list.
          this.openPage(0, () => {
            clipboard.writeText(clipboardItem);

            this.selectionIndex    = -1;
            this.query             = '';
            this.currentSearchPage =  0;

            this.hideWindow();
          });
        });
    },

    /**
     * Hides app window.
     */
    hideWindow() {
      ipcRenderer.send('hideWindow');
    },

    /**
     * Loads newer set of clipboard items into the view. Doesn't do anything
     * if we are on the first page already.
     */
    openPreviousPage() {
      if (this.currentPage > 0) {
        this.openPage(this.currentPage - 1);
      }
    },

    /**
     * Moves selection up one item. If we are already on the top item the
     * selection is moved to the bottom of the list.
     */
    selectPrevious() {
      if (this.selectionIndex === 0) {
        this.selectionIndex = this.clipboardContent.length - 1;
      } else {
        this.selectionIndex--;
      }
    },

    /**
     * Loads older set of clipboard items into the view. Doesn't do anything
     * if we are on the last page already.
     */
    openNextPage() {
      if ((Math.ceil(this.clipboardItemCount / 9)) > this.currentPage + 1) {
        this.openPage(this.currentPage + 1);
      }
    },

    /**
     * Moves selection down one item. If we are already on the bottom item the
     * selection is moved to the top of the list.
     */
    selectNext() {
      if (this.selectionIndex == this.clipboardContent.length - 1) {
        this.selectionIndex = 0;
      } else {
        this.selectionIndex++;
      }
    }
  },

  offerMacOSUpdate(updateUrl) {
    if (process.platform === 'darwin' && updateUrl.indexOf('.dmg') !== -1) {
      ipcRenderer.send('offer-update', { url: updateUrl });
    }
  },

  offerWin64Update(updateUrl) {
    if (process.platform === 'win32' && process.env.PROCESSOR_ARCHITECTURE === 'AMD64' &&
        updateUrl.indexOf('x64') !== -1) {

      ipcRenderer.send('offer-update', { url: updateUrl });
    }
  },

  offerWin32Update(updateUrl) {
    if (process.platform === 'win32' && process.env.PROCESSOR_ARCHITECTURE === 'x86' &&
        updateUrl.indexOf('ia32') !== -1) {

      ipcRenderer.send('offer-update', { url: updateUrl });
    }
  },

  /**
   * Initializes the application.
   */
  ready() {
    // Query GitHub to see if a new version of Olden is available.
    // TODO: implement autoupdater!
    fetch('https://api.github.com/repos/aigarsdz/olden/releases/latest')
      .then((response) => { return response.json() })
      .then((data) => {
        if (data.tag_name && data.tag_name != `v${packageInfo.version}`) {
          data.assets.forEach((asset) => {
            this.offerMacOSUpdate(asset.browser_download_url);
            this.offerWin64Update(asset.browser_download_url);
            this.offerWin32Update(asset.browser_download_url);
          });
        }
      }).catch((err) => console.log(err));

    document.addEventListener('keydown', (e) => {
      if (keyActionMap[e.keyCode]) {
        this[keyActionMap[e.keyCode]]();
      }
    });

    db.items.where('favorite').equals(0).count((count) => {
      this.clipboardItemCount = count;
    });

    this.loadClipboard(() => {
      // NOTE: MacOS has no native interface to listen for clipboard changes,
      // therefore, polling is the only option. We should do as little
      // processing as possible in this function to preserve system resources.
      // TODO: Windows has an interface for this purpose. We should at least
      // try to integrate it in the app.
      setInterval(() => {
        const clipboardText = clipboard.readText();

        if (clipboardText.length > 0 && clipboardText != this.lastClipboardItem) {
          // Delete the item if it's already in the clipboard to avoid extra checks.
          db.items.where('text').equals(clipboardText).delete()
            .then((count) => {
              // TODO: try to remove the item without checking if it's in the array!
              if (this.clipboardContent.includes(clipboardText)) {
                const clipboardItem = this.clipboardContent.splice(
                  this.clipboardContent.indexOf(clipboardText), 1
                )[0];
              } else if (this.clipboardContent.length === 9) {
                this.clipboardContent.pop();
              }

              this.clipboardItemCount -= count;
            })
            .then(() => {
              this.clipboardContent.unshift(clipboardText);
              db.items.add({ text: clipboardText, favorite: 0 });

              this.lastClipboardItem = clipboardText;
              this.clipboardItemCount++;
            });
        }
      }, 500);
    }, true);

    ipcRenderer.on('clearClipboardHistory', () => {
      db.items.clear().then(() => {
        this.lastClipboardItem = '';
        this.clipboardItemCount = 0;
        this.selectionIndex = -1;
        this.query = '';

        this.openPage(0);
      });
    });
  }
});

vm.$watch('query', (value) => {
  if (value.length > 0) {
    db.items.where('text').startsWithIgnoreCase(value).count((count) => {
      vm.searchItemCount = count;
    });

    db.items
      .where('text').startsWithIgnoreCase(value)
      .reverse()
      .offset(9 * vm.currentSearchPage)
      .limit(9)
      .sortBy('id')
      .then((items) => {
        items.forEach((item) => vm.searchResults.push(item.text));
      });
  } else {
    vm.searchResults = [];
    vm.currentSearchPage = 0;
  }
});