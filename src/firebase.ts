import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Category, Product, RestaurantConfig, TableCall } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Support Vercel and GitHub environment variables as overrides for portability
const metaEnv = (import.meta as any).env || {};
const finalConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "(default)",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Error handler specified by firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    // Seed target developer as admin if not already seeded
    const targetAdminEmail = 'carinaandreanieto@gmail.com';
    const adminDocRef = doc(db, 'admins', 'primary_admin');
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      await setDoc(adminDocRef, { email: targetAdminEmail });
    }
    
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Helper to look up users by email and initialize their UID record
async function checkAndSeedAdminByEmail(user: User): Promise<boolean> {
  try {
    const userEmail = user.email?.trim().toLowerCase();
    if (!userEmail) return false;

    // Check if doc by UID already exists
    const docSnap = await getDoc(doc(db, 'admins', user.uid));
    if (docSnap.exists()) return true;

    // Search existing admin records for this email
    const snap = await getDocs(collection(db, 'admins'));
    let found = false;
    snap.forEach((docRef) => {
      const data = docRef.data();
      if (data && data.email && data.email.trim().toLowerCase() === userEmail) {
        found = true;
      }
    });

    if (found) {
      await setDoc(doc(db, 'admins', user.uid), { email: userEmail });
      return true;
    }
    return false;
  } catch (e) {
    console.error("Error checking/seeding admin by email", e);
    return false;
  }
}

// Auth Helpers
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Auto-seed admin if it's the primary developer
    if (user.email === 'carinaandreanieto@gmail.com') {
      await setDoc(doc(db, 'admins', user.uid), { email: user.email });
    } else if (user) {
      await checkAndSeedAdminByEmail(user);
    }
    
    return user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await checkAndSeedAdminByEmail(user);
    }
    callback(user);
  });
}

// -----------------------------------------------------------------
// DATABASE OPERATIONS
// -----------------------------------------------------------------

const DEFAULT_CONFIG: RestaurantConfig = {
  restaurantName: "Wafle AG",
  pinCode: "99999",
  whatsappNumber: "+5491122334455",
  isOpen: true,
  chefSuggestion: {
    name: "Waffle de la Casa",
    description: "Delicioso waffle con dulce de leche y frutas frescas.",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%231e1b4b'/><path d='M30,70 Q50,20 70,70 Z' fill='%23fbbf24'/><circle cx='50' cy='45' r='10' fill='%23b91c1c'/></svg>",
    price: 5500,
    active: true
  }
};

// 1. Configuration
export async function getRestaurantConfig(): Promise<RestaurantConfig> {
  const path = 'config/restaurant';
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_CONFIG, ...docSnap.data() } as RestaurantConfig;
    }
    // Seed and return default
    await setDoc(docRef, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return DEFAULT_CONFIG;
  }
}

export async function saveRestaurantConfig(config: RestaurantConfig): Promise<void> {
  const path = 'config/restaurant';
  try {
    await setDoc(doc(db, path), config);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

// 2. Categories
export async function fetchCategories(): Promise<Category[]> {
  const path = 'categories';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    const list: Category[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Category);
    });
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
    return [];
  }
}

export function subscribeCategories(callback: (categories: Category[]) => void) {
  const path = 'categories';
  const q = query(collection(db, path), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const list: Category[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Category);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveCategory(category: Category): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), category);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function removeCategory(id: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

// 3. Products
export async function fetchProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: Product[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Product);
    });
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
    return [];
  }
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  const path = 'products';
  return onSnapshot(collection(db, path), (snap) => {
    const list: Product[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Product);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveProduct(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function removeProduct(id: string): Promise<void> {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

// 4. Calls
export function subscribeCalls(callback: (calls: TableCall[]) => void) {
  const path = 'calls';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: TableCall[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as TableCall);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveCall(call: TableCall): Promise<void> {
  const path = `calls/${call.id}`;
  try {
    // Sanitize the object to remove keys that have undefined values, preventing Firestore SDK crashes
    const sanitized: any = {};
    Object.keys(call).forEach((key) => {
      const val = (call as any)[key];
      if (val !== undefined) {
        sanitized[key] = val;
      }
    });

    await setDoc(doc(db, 'calls', call.id), sanitized);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function removeCall(id: string): Promise<void> {
  const path = `calls/${id}`;
  try {
    await deleteDoc(doc(db, 'calls', id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

export async function isAdminUser(uid: string): Promise<boolean> {
  try {
    // 1. Check if user document exists by UID
    const docSnap = await getDoc(doc(db, 'admins', uid));
    if (docSnap.exists()) return true;

    // 2. Check if logged-in user email is authorized in database
    const currentUser = auth.currentUser;
    if (currentUser) {
      const isAuthorized = await checkAndSeedAdminByEmail(currentUser);
      if (isAuthorized) return true;
    }

    // 3. Fallback check for primary_admin if the user is the owner
    const primaryAdminSnap = await getDoc(doc(db, 'admins', 'primary_admin'));
    if (primaryAdminSnap.exists()) {
      const adminData = primaryAdminSnap.data();
      if (adminData.email === auth.currentUser?.email && adminData.email === 'carinaandreanieto@gmail.com') {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

// 5. Admin List Management Operations
export async function addAdminEmail(email: string): Promise<void> {
  const sanitizedEmail = email.trim().toLowerCase();
  if (!sanitizedEmail) return;
  const docId = `email_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const path = `admins/${docId}`;
  try {
    await setDoc(doc(db, 'admins', docId), { email: sanitizedEmail, invitedAt: new Date().toISOString() });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function removeAdminEmail(docId: string): Promise<void> {
  const path = `admins/${docId}`;
  try {
    await deleteDoc(doc(db, 'admins', docId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

export async function fetchAdminsList(): Promise<{ id: string; email: string; isPreSeeded?: boolean }[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, 'admins'));
    const list: { id: string; email: string; isPreSeeded?: boolean }[] = [];
    snap.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data && data.email) {
        list.push({ 
          id: docSnapshot.id, 
          email: data.email,
          isPreSeeded: docSnapshot.id === 'primary_admin' || docSnapshot.id === 'primary_admin_uid' || data.email === 'carinaandreanieto@gmail.com'
        });
      }
    });

    // Deduplicate by lowercased email
    const emailsMap = new Map<string, { id: string; email: string; isPreSeeded?: boolean }>();
    list.forEach(item => {
      const key = item.email.toLowerCase();
      const existingItem = emailsMap.get(key);
      if (!existingItem || (item.isPreSeeded && !existingItem.isPreSeeded)) {
        emailsMap.set(key, item);
      }
    });
    
    return Array.from(emailsMap.values());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
    return [];
  }
}
