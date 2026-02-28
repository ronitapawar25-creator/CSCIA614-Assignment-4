import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, getDocs, writeBatch, where } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously as fbSignInAnonymously, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC-i6CYcva5mzsBOxyclW6hx67E_rNCep0',
  authDomain: 'cscia614.firebaseapp.com',
  projectId: 'cscia614',
  storageBucket: 'cscia614.firebasestorage.app',
  messagingSenderId: '187041939025',
  appId: '1:187041939025:web:6b7205f923362d25fe8270',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export const ITEMS_COLLECTION = 'ShoppingList'
export const DELETION_LOGS_COLLECTION = 'DeletionLogs'

export async function logDeletion(userId: string, userName: string) {
  try {
    await addDoc(collection(db, DELETION_LOGS_COLLECTION), {
      userId,
      userName,
      deletedAt: Date.now(),
      timestamp: new Date().toLocaleString()
    })
  } catch (err) {
    console.error('Failed to log deletion:', err)
  }
}

export function subscribeToLatestDeletion(callback: (log: any | null) => void) {
  const q = query(collection(db, DELETION_LOGS_COLLECTION))
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null)
      return
    }
    const logs = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }))
    // Get the latest deletion (most recent timestamp)
    const latest = logs.reduce((max, current) => 
      (current.deletedAt > max.deletedAt) ? current : max
    )
    callback(latest)
  })
}

export async function addItem(item: any) {
  try {
    const result = await addDoc(collection(db, ITEMS_COLLECTION), item)
    console.log('Item added with ID:', result.id)
    return result
  } catch (err) {
    console.error('Failed to add item:', err)
    throw err
  }
}

export async function updateItem(itemId: string, updates: any) {
  try {
    await updateDoc(doc(db, ITEMS_COLLECTION, itemId), updates)
  } catch (err) {
    console.error('Failed to update item:', err)
  }
}

export async function deleteItem(itemId: string) {
  try {
    await deleteDoc(doc(db, ITEMS_COLLECTION, itemId))
  } catch (err) {
    console.error('Failed to delete item:', err)
  }
}

export async function deleteAllItems() {
  try {
    const snap = await getDocs(collection(db, ITEMS_COLLECTION))
    const batch = writeBatch(db)
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    return batch.commit()
  } catch (err) {
    console.error('Failed to delete all items:', err)
  }
}

export function subscribeToItems(userId: string, callback: (items: any[]) => void) {
  const q = query(collection(db, ITEMS_COLLECTION))
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }))
    callback(items)
  })
}

// Authentication functions
export async function signUp(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function signInAnonymously() {
  try {
    const userCredential = await fbSignInAnonymously(auth)
    return userCredential.user
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function signOut() {
  try {
    await fbSignOut(auth)
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider)
    return userCredential.user
  } catch (err: any) {
    throw new Error(err.message)
  }
}
