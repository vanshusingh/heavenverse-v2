import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

// Read environment parameters
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Check if credentials are set
const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
)

// Initialize Firebase app safely
let app
if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  } catch (error) {
    console.error("Firebase initialization failed:", error)
  }
}

// Export Auth services
export const auth = app ? getAuth(app) : null
export const googleProvider = new GoogleAuthProvider()

// Set custom Google Client ID parameter
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "387638595849-0etmqpfthu2081vg31agcje02mq5q37f.apps.googleusercontent.com"
googleProvider.setCustomParameters({
  client_id: googleClientId
})

export const firebaseAvailable = isConfigured && Boolean(auth)

if (!firebaseAvailable) {
  console.warn(
    "Firebase is not configured. Authentication will run in local client-only mock fallback mode."
  )
}
