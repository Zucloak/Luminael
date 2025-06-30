
'use client';

import type { PastQuiz } from '@/lib/types';

const DB_NAME = 'LuminaelCacheDB';
const DB_VERSION = 3; // Incremented to remove old object store
const QUIZ_STORE_NAME = 'pastQuizzes';

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
            const oldVersion = event.oldVersion;

            if (oldVersion < 2 && !db.objectStoreNames.contains(QUIZ_STORE_NAME)) {
                db.createObjectStore(QUIZ_STORE_NAME, { keyPath: 'id' });
            }
            if (oldVersion > 0 && oldVersion < 3 && db.objectStoreNames.contains('fileContents')) {
                db.deleteObjectStore('fileContents');
            }
             if (!db.objectStoreNames.contains(QUIZ_STORE_NAME)) {
                db.createObjectStore(QUIZ_STORE_NAME, { keyPath: 'id' });
            }
        };
    });

    return dbPromise;
}

// --- Functions for Quiz History ---

export async function addPastQuiz(quizData: PastQuiz): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction(QUIZ_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(QUIZ_STORE_NAME);
        store.put(quizData);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error("Could not add quiz to IndexedDB:", error);
        throw error;
    }
}

export async function getPastQuizzes(): Promise<PastQuiz[]> {
    try {
        const db = await openDB();
        const transaction = db.transaction(QUIZ_STORE_NAME, 'readonly');
        const store = transaction.objectStore(QUIZ_STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                // Sort by date, newest first
                resolve(request.result.sort((a, b) => b.id - a.id));
            };
            request.onerror = () => {
                console.error('Get all request error:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error("Could not get past quizzes from IndexedDB:", error);
        return [];
    }
}

export async function getPastQuizById(id: number): Promise<PastQuiz | undefined> {
    try {
        const db = await openDB();
        const transaction = db.transaction(QUIZ_STORE_NAME, 'readonly');
        const store = transaction.objectStore(QUIZ_STORE_NAME);
        const request = store.get(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result as PastQuiz | undefined);
            };
            request.onerror = () => {
                console.error('Get by ID request error:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error("Could not get quiz by ID from IndexedDB:", error);
        return undefined;
    }
}

export async function deletePastQuiz(id: number): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction(QUIZ_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(QUIZ_STORE_NAME);
        store.delete(id);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Delete transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error("Could not delete quiz from IndexedDB:", error);
        throw error;
    }
}
