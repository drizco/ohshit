import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator, ref as dbRef } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  databaseURL:
    process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:9000?ns=demo-oopsie-poopsie'
      : process.env.NEXT_PUBLIC_DB_URL,
  projectId:
    process.env.NODE_ENV === 'development'
      ? 'demo-oopsie-poopsie'
      : process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
}

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getDatabase(app)

// Connect to emulators in development (client-side only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectDatabaseEmulator(db, '127.0.0.1', 9000)
}

export const ref = (path?: string) => (path ? dbRef(db, path) : dbRef(db))
