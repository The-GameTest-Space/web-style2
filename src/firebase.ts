import { initializeApp } from 'firebase/app'

// Web app "GTSpace Web" in the-game-test-space-f48d2, from
// `firebase apps:sdkconfig WEB`. This config is public: it identifies the
// project, it does not grant access. Import `firebaseApp` when a feature
// needs Firestore, Auth, Analytics, etc.
export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyDNfnA32pCj7QI3dHXROJ57VcNkXjJBvOk',
  authDomain: 'the-game-test-space-f48d2.firebaseapp.com',
  projectId: 'the-game-test-space-f48d2',
  storageBucket: 'the-game-test-space-f48d2.firebasestorage.app',
  messagingSenderId: '360225407610',
  appId: '1:360225407610:web:5522e1242021783c7fb1c3',
  measurementId: 'G-PQ78N1D8EW',
})
