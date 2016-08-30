const {ipcRenderer, clipboard} = require("electron");

const KEY_DEL   = 8;
const KEY_ENTER = 13;
const KEY_LEFT  = 37;
const KEY_UP    = 38;
const KEY_RIGHT = 39;
const KEY_DOWN  = 40;

const Dexie = require('dexie');
const db = new Dexie('clipboard');

db.version(1).stores({
  items: '++id, &text, favorite'
});

const vm = new Vue({
  el: '#app',

  data: {
    clipboardContent: [],
    lastClipboardItem: '',
    clipboardItemCount: 0,
    selectionIndex: -1,
    filter: '',
    currentPage: 0
  },

  methods: {
    loadClipboard(callback, setLastItem) {
      setLastItem = setLastItem || false;

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
          this.clipboardContent = items.map((item) => item.text);

          if (items.length > 0 && setLastItem) {
            this.lastClipboardItem = items[0].text;
          }
        })
        .then(callback);
    },

    openPage(index, callback) {
      this.currentPage = index;

      this.loadClipboard(callback);
    }
  },

  ready() {
    document.addEventListener('keydown', (e) => {
      if (e.keyCode == KEY_DOWN) {
        if (this.selectionIndex == this.clipboardContent.length - 1) {
          this.selectionIndex = 0;
        } else {
          this.selectionIndex++;
        }
      }

      if (e.keyCode == KEY_UP) {
        if (this.selectionIndex === 0) {
          this.selectionIndex = this.clipboardContent.length -1;
        } else {
          this.selectionIndex--;
        }
      }

      if (e.keyCode == KEY_ENTER) {
        const clipboardItem = this.clipboardContent.splice(this.selectionIndex, 1)[0];

        db.items
          .where('text').equals(clipboardItem)
          .delete()
          .then(() => {
            this.clipboardItemCount--;

            this.openPage(0, () => {
              clipboard.writeText(clipboardItem);

              this.selectionIndex = -1;
              ipcRenderer.send('hideWindow');
            });
          });
      }

      if (e.keyCode == KEY_LEFT && this.currentPage > 0) {
        this.openPage(this.currentPage - 1);
      }

      if (e.keyCode == KEY_RIGHT && (Math.ceil(this.clipboardItemCount / 9)) > this.currentPage + 1) {
        this.openPage(this.currentPage + 1);
      }
    });

    db.items.where('favorite').equals(0).count((count) => {
      this.clipboardItemCount = count;
    });

    this.loadClipboard(() => {
      setInterval(() => {
        const clipboardText = clipboard.readText();

        if (clipboardText != this.lastClipboardItem) {
          db.items.where('text').equals(clipboardText).delete()
            .then((count) => {
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
        this.filter = '';

        this.openPage(0);
      });
    });
  }
});

vm.$watch('filter', (value) => {
  console.log(value);
});