export interface LocalTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: string
  type: "uploaded" | "downloaded"
  fileBlob?: Blob
  streamUrl?: string
  coverArt?: string // Data URL or generated accent color index
  addedAt: number
}

export interface LocalPlaylist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
}

const DB_NAME = "HeavenVerseDB"
const DB_VERSION = 1

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in browser environments"))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error("IndexedDB failed to open:", request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("playlists")) {
        db.createObjectStore("playlists", { keyPath: "id" })
      }
    }
  })
}

// Track operations
export async function saveTrack(track: LocalTrack): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tracks", "readwrite")
    const store = transaction.objectStore("tracks")
    const request = store.put(track)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAllTracks(): Promise<LocalTrack[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tracks", "readonly")
    const store = transaction.objectStore("tracks")
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tracks", "readwrite")
    const store = transaction.objectStore("tracks")
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Playlist operations
export async function savePlaylist(playlist: LocalPlaylist): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("playlists", "readwrite")
    const store = transaction.objectStore("playlists")
    const request = store.put(playlist)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAllPlaylists(): Promise<LocalPlaylist[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("playlists", "readonly")
    const store = transaction.objectStore("playlists")
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("playlists", "readwrite")
    const store = transaction.objectStore("playlists")
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllData(): Promise<void> {
  const db = await initDB()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["tracks", "playlists"], "readwrite")
    const trackStore = transaction.objectStore("tracks")
    const playlistStore = transaction.objectStore("playlists")

    trackStore.clear()
    playlistStore.clear()

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
