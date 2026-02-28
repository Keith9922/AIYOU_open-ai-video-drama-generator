const DB_NAME = 'sunstudio_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
};

export const saveToStorage = async (key: string, data: any) => {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

export const loadFromStorage = async <T>(key: string): Promise<T | undefined> => {
    const db = await getDB();
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        // request.result is undefined if the key does not exist, which is what we want to return
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
};