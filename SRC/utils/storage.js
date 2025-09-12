
/**
 * v0.3 Storage layer with per-user namespacing.
 * Supports: localStorage (default), sessionStorage, and IndexedDB fallback.
 * Public API:
 *   const store = createStorage({userId: 'anon', driver: 'local'});
 *   await store.set('progress', { topicId: 'add_1', score: 8 });
 *   const p = await store.get('progress');
 *   await store.remove('progress');
 *   await store.clear();
 */
(function(global){
  'use strict';

  const hasLocal = (() => {
    try {
      const k = '__probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch(e) { return false; }
  })();

  const hasSession = (() => {
    try {
      const k = '__probe__';
      window.sessionStorage.setItem(k, '1');
      window.sessionStorage.removeItem(k);
      return true;
    } catch(e) { return false; }
  })();

  // Minimal IndexedDB wrapper
  const idb = {
    db: null,
    open(dbName = 'math-trainer-db', storeName = 'kv') {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => reject(req.error);
      });
    },
    async get(storeName, key) {
      if (!this.db) await this.open();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    async set(storeName, key, val) {
      if (!this.db) await this.open();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(val, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },
    async remove(storeName, key) {
      if (!this.db) await this.open();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },
    async clear(storeName) {
      if (!this.db) await this.open();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  };

  function createStorage({ userId = 'anon', driver = 'local', prefix = 'mt' } = {}) {
    const ns = `${prefix}:${userId}:`; // per-user namespace
    const storeName = 'kv';

    async function _get(key) {
      const k = ns + key;
      if (driver === 'local' && hasLocal) {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
      }
      if (driver === 'session' && hasSession) {
        const raw = sessionStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
      }
      // IndexedDB fallback
      const raw = await idb.get(storeName, k);
      return raw ? JSON.parse(raw) : null;
    }

    async function _set(key, value) {
      const k = ns + key;
      const str = JSON.stringify(value);
      if (driver === 'local' && hasLocal) {
        localStorage.setItem(k, str);
        return true;
      }
      if (driver === 'session' && hasSession) {
        sessionStorage.setItem(k, str);
        return true;
      }
      return idb.set(storeName, k, str);
    }

    async function _remove(key) {
      const k = ns + key;
      if (driver === 'local' && hasLocal) {
        localStorage.removeItem(k);
        return true;
      }
      if (driver === 'session' && hasSession) {
        sessionStorage.removeItem(k);
        return true;
      }
      return idb.remove(storeName, k);
    }

    async function _clear() {
      // Clear ONLY this namespace
      if ((driver === 'local' && hasLocal) || (driver === 'session' && hasSession)) {
        const source = driver === 'local' ? localStorage : sessionStorage;
        const keys = [];
        for (let i = 0; i < source.length; i++) {
          const key = source.key(i);
          if (key && key.startsWith(ns)) keys.push(key);
        }
        keys.forEach(k => source.removeItem(k));
        return true;
      }
      // IndexedDB: iterate and delete by prefix
      if (!idb.db) await idb.open();
      return new Promise((resolve, reject) => {
        const tx = idb.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (typeof cursor.key === 'string' && cursor.key.startsWith(ns)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }

    return {
      async get(key){ return _get(key); },
      async set(key, val){ return _set(key, val); },
      async remove(key){ return _remove(key); },
      async clear(){ return _clear(); },
      namespace: ns,
      driver
    };
  }

  // UMD export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createStorage };
  } else {
    global.createStorage = createStorage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
