import type { Database, DatabaseReference } from 'firebase/database'
import type { Auth } from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'

export type { Database, DatabaseReference, Auth, FirebaseApp }

export interface FirebaseConfig {
  apiKey?: string
  authDomain?: string
  databaseURL?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
}
