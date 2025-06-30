
'use client';

const DB_NAME = 'LuminaelCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileContents';

interface StoredFile {
    name: string;
    content: string;
    timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            console.warn("IndexedDB is not supported by this browser or running on the server.");
            return reject(new Error("IndexedDB not supported."));
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(new Error('IndexedDB error'));
            dbPromise = null; // Reset promise on error
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
    });

    return dbPromise;
}

export async function addFileContent(file: { name: string; content: string }): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const dataToStore: StoredFile = {
            ...file,
            timestamp: Date.now()
        };
        store.put(dataToStore);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error("Could not add file to IndexedDB:", error);
    }
}

export async function getFileContent(name: string): Promise<StoredFile | undefined> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(name);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result as StoredFile | undefined);
            };
            request.onerror = () => {
                console.error('Get request error:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error("Could not get file from IndexedDB:", error);
        return undefined;
    }
}

export async function deleteFileContent(name: string): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(name);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Delete transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error("Could not delete file from IndexedDB:", error);
    }
}
