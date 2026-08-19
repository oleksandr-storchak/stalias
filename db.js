const DB_NAME = 'alias';
const STORE_NAME = 'words';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      } else {
        store = request.transaction.objectStore(STORE_NAME);
      }
      if (!store.indexNames.contains('word')) {
        store.createIndex('word', 'word', { unique: true });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// tops the store up rather than seeding only when empty: a dictionary that
// grew after install would otherwise never reach anyone who already played,
// and diffing against what is stored keeps their own added words untouched
async function dbSeedWords() {
  const existing = new Set((await dbGetAllWords()).map((item) => item.word));
  const res = await fetch('words.json');
  const words = await res.json();
  const missing = words
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word && !existing.has(word));
  if (missing.length === 0) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    missing.forEach((word) => store.add({ word }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAllWords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbAddWord(word) {
  word = word.trim().toLowerCase();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('word');
    const check = index.get(word);
    check.onsuccess = () => {
      if (check.result) {
        tx.abort();
        reject(new Error('Word already exists'));
      } else {
        store.add({ word });
      }
    };
    check.onerror = () => {
      tx.abort();
      reject(check.error);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbUpdateWord(id, word) {
  word = word.trim().toLowerCase();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, word });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDeleteWord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
