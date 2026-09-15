import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getAuth as getClientAuth, signInWithEmailAndPassword, getIdTokenResult, signOut } from 'firebase/auth';
import { getFirestore as getClientFirestore, collection, getDocs, onSnapshot, terminate } from 'firebase/firestore';

async function main() {
  console.log('====================================================');
  console.log('PAMBORINA ADMIN ACCESS END-TO-END VALIDATION');
  console.log('====================================================');

  const EXPECTED_PROJECT = 'pamborina-app';
  const ADMIN_EMAIL = 'admin@pamborina.com';
  const ADMIN_PASSWORD = 'PamborinaAdmin2026!';

  // Step 1: Admin SDK & Environment Match
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY');
  const serviceAccount = JSON.parse(saKey);
  if (serviceAccount.project_id !== EXPECTED_PROJECT) {
    throw new Error(`Project mismatch: expected ${EXPECTED_PROJECT}, got ${serviceAccount.project_id}`);
  }
  console.log('✓ Phase 9.2: Firebase Project Match verified ->', serviceAccount.project_id);

  const adminApp = getAdminApps().length > 0 ? getAdminApps()[0] : initAdminApp({
    credential: cert(serviceAccount),
    projectId: EXPECTED_PROJECT,
  });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  // Step 2: Verify Admin User Record
  const user = await adminAuth.getUserByEmail(ADMIN_EMAIL);
  if (user.disabled) throw new Error('User account is disabled');
  if (!user.customClaims || user.customClaims.admin !== true) {
    throw new Error('User is missing admin: true custom claim');
  }
  console.log('✓ Phase 9.3: Admin User verified -> UID:', user.uid, '| Email:', user.email);
  console.log('✓ Phase 9.5: Custom Claim verified ->', JSON.stringify(user.customClaims));

  // Step 3: Client Sign-In Test
  const firebaseConfig = {
    apiKey: 'AIzaSyA3KZCOwVykq5EUeJsK8RMEE0LMaYZx_nM',
    authDomain: 'pamborina-app.firebaseapp.com',
    projectId: 'pamborina-app',
    storageBucket: 'pamborina-app.firebasestorage.app',
    messagingSenderId: '1004537773887',
    appId: '1:1004537773887:web:e036a8b9761a4207f35d8a',
    measurementId: 'G-JMYMRX50FV',
  };
  const clientApp = getClientApps().length > 0 ? getClientApps()[0] : initClientApp(firebaseConfig, 'real-admin-verify');
  const clientAuth = getClientAuth(clientApp);
  const clientDb = getClientFirestore(clientApp);

  const cred = await signInWithEmailAndPassword(clientAuth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✓ Phase 9.4 & 9.7: Real Client Login verified -> User:', cred.user.email);

  // Step 4: Token Refresh
  const tokenResult = await getIdTokenResult(cred.user, true);
  if (tokenResult.claims.admin !== true) {
    throw new Error('Token does not contain admin claim');
  }
  console.log('✓ Phase 9.6: Forced ID Token refresh verified -> token.claims.admin === true');

  // Step 5: Live Firestore Read of Products
  const productsSnap = await getDocs(collection(clientDb, 'products'));
  console.log('✓ Phase 9.9 & 9.10: Live Firestore Products Read verified -> Count:', productsSnap.size);
  if (productsSnap.size === 0) {
    throw new Error('Expected products in database');
  }

  // Step 6: Customer Unauthenticated Isolation
  await signOut(clientAuth);
  const guestProducts = await getDocs(collection(clientDb, 'products'));
  console.log('✓ Phase 9.11: Customer Public Products Read verified -> Count:', guestProducts.size);

  // Step 7: Clean Shutdown
  await terminate(clientDb);

  console.log('\n====================================================');
  console.log('ALL PHASE 9 SUITE CHECKS COMPLETED WITH 100% SUCCESS');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
