const { ipcRenderer, clipboard } = require('electron');
const path                       = require('path');
const packageInfo                = require(path.join(__dirname, 'package.json'));

const Dexie = require('dexie');
const db = new Dexie('clipboard');

db.version(1).stores({
  items: '++id, &text, favorite'
});

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

    /**
     * Hides app window.
     */
    hideWindow() {
      ipcRenderer.send('hideWindow');
    },

    /**
     * Deletes item from the clipboard history.
     */
    deleteItem() {
      if (this.selectionIndex !== -1) {
        const collection    = this.query.length === 0 ? 'clipboardContent' : 'searchResults';
        const clipboardItem = this[collection].splice(this.selectionIndex, 1)[0];

        db.items.where('text').equals(clipboardItem).delete().then((count) => {
          this.selectionIndex    = -1;
          this.currentPage       = 0;
          this.currentSearchPage = 0;

          if (this.query.length > 0) {
            this.searchClipboard(this.query);
          } else {
            this.loadClipboard();
          }
        });
      }
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
     * Checks if the app is running on MacOS and the asset points to a DMG archive
     * and offers to download a MacOS update if the comdisions are met.
     *
     * @param {String} updateUrl
     */
    offerMacOSUpdate(updateUrl) {
      if (process.platform === 'darwin' && updateUrl.indexOf('.dmg') !== -1) {
        ipcRenderer.send('offer-update', { url: updateUrl });
      }
    },

    /**
     * Checks if the app is running on 64bit Windows and the asset points to a
     * 64bit ZIP archive and offers to download a 64bit Windows update if the
     * comdisions are met.
     *
     * @param {String} updateUrl
     */
    offerWin64Update(updateUrl) {
      if (process.platform === 'win32' && process.env.PROCESSOR_ARCHITECTURE === 'AMD64' &&
          updateUrl.indexOf('win32-x64') !== -1) {

        ipcRenderer.send('offer-update', { url: updateUrl });
      }
    },

    /**
     * Checks if the app is running on 32bit Windows and the asset points to a
     * 32bit ZIP archive and offers to download a 32bit Windows update if the
     * comdisions are met.
     *
     * @param {String} updateUrl
     */
    offerWin32Update(updateUrl) {
      if (process.platform === 'win32' && process.env.PROCESSOR_ARCHITECTURE === 'x86' &&
          updateUrl.indexOf('win32-ia32') !== -1) {

        ipcRenderer.send('offer-update', { url: updateUrl });
      }
    },

    /**
     * Checks if the app is running on 32bit Linux and the asset points to a
     * 32bit ZIP archive and offers to download a 32bit Linux update if the
     * comdisions are met.
     *
     * @param {String} updateUrl
     */
    offerLinux32Update(updateUrl) {
      if (process.platform === 'linux' && process.env.PROCESSOR_ARCHITECTURE === 'x86' &&
          updateUrl.indexOf('linux-ia32') !== -1) {

        ipcRenderer.send('offer-update', { url: updateUrl });
      }
    },

    /**
     * Checks if the app is running on 64bit Linux and the asset points to a
     * 64bit ZIP archive and offers to download a 64bit Linux update if the
     * comdisions are met.
     *
     * @param {String} updateUrl
     */
    offerLinux64Update(updateUrl) {
      if (process.platform === 'linux' && process.env.PROCESSOR_ARCHITECTURE === 'AMD64' &&
          updateUrl.indexOf('linux-x64') !== -1) {

        ipcRenderer.send('offer-update', { url: updateUrl });
      }
    },

    /**
     * Performs a clipboard search with the given search needle.
     *
     * @param {String} needle
     */
    searchClipboard(needle) {
      db.items.where('text').startsWithIgnoreCase(needle).count((count) => {
        vm.searchItemCount = count;
      });

      db.items
        .where('text').startsWithIgnoreCase(needle)
        .reverse()
        .offset(9 * vm.currentSearchPage)
        .limit(9)
        .sortBy('id')
        .then((items) => {
          vm.searchResults = [];

          items.forEach((item) => vm.searchResults.push(item.text));
        });
    },

    /**
     * Assigns actions to specifickeyboard events.
     */
    initActionKeys() {
      Mousetrap.bind('up', () => {
        if (this.selectionIndex === 0) {
          this.selectionIndex = this.clipboardContent.length - 1;
        } else {
          this.selectionIndex--;
        }
      });

      Mousetrap.bind('right', () => {
        if (this.query.length === 0) {
          if ((Math.ceil(this.clipboardItemCount / 9)) > this.currentPage + 1) {
            this.openPage(this.currentPage + 1);
          }
        } else {
          this.currentSearchPage++;
          this.searchClipboard(this.query);
        }
      });

      Mousetrap.bind('down', () => {
        if (this.selectionIndex == this.clipboardContent.length - 1) {
          this.selectionIndex = 0;
        } else {
          this.selectionIndex++;
        }
      });

      Mousetrap.bind('left', () => {
        if (this.query.length === 0) {
          if (this.currentPage > 0) {
            this.openPage(this.currentPage - 1);
          }
        } else {
          this.currentSearchPage--;
          this.searchClipboard(this.query);
        }
      });

      Mousetrap.bind('esc', this.hideWindow);
      Mousetrap.bind('enter', this.copyItem);

      if (process.platform === 'darwin') {
        Mousetrap.bind('command+backspace', this.deleteItem);
      } else {
        Mousetrap.bind('ctrl+backspace', this.deleteItem);
      }
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

      this.initActionKeys();

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

    ipcRenderer.on('exportClipboardHistoryAsJSON', () => {
      db.items.toArray().then((items) => {
        ipcRenderer.send('saveExportedData', { items: JSON.stringify(items), format: 'json' })
      });
    });

    ipcRenderer.on('exportClipboardHistoryAsTXT', () => {
      db.items.toArray().then((items) => {
        ipcRenderer.send('saveExportedData', {
          items: items.map((item) => item.text).join('\n'),
          format: 'txt'
        })
      });
    });
  }
});

vm.$watch('query', (value) => {
  if (value.length > 0) {
    vm.searchClipboard(value);
  } else {
    vm.searchResults = [];
    vm.currentSearchPage = 0;
  }
});