/**
 * Server-Side Admin Role Assignment Script
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts <USER_FIREBASE_AUTH_UID>
 *
 * Requirements:
 *   - Must be executed in a secure server-side environment with valid Google Application Credentials:
 *     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
 *     OR
 *     export FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'
 *
 * Notes:
 *   - This script NEVER hard-codes credentials or UIDs.
 *   - Custom claims are set server-side via Firebase Admin SDK.
 *   - Setting custom claims requires the user to refresh their ID token on their next session/action.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function setAdminRole() {
  const target = process.argv[2] || 'admin@pamborina.com';
  const targetIdentifier = target.trim();

  console.log('======================================================');
  console.log('🛡️  Pamborina Firebase Admin Role Assignment');
  console.log(`🎯 Target user: "${targetIdentifier}"`);
  console.log('======================================================\n');

  // Initialize Firebase Admin SDK
  let adminApp;
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        const serviceAccount = raw.startsWith('{')
          ? JSON.parse(raw)
          : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));

        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || 'pamborina-app',
        });
        console.log('🔑 Initialized using FIREBASE_SERVICE_ACCOUNT_KEY env');
      } catch (err: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
        process.exit(1);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || 'pamborina-app',
        });
        console.log('🔑 Initialized using GOOGLE_APPLICATION_CREDENTIALS file');
      } catch (err: any) {
        console.error('❌ Failed to read GOOGLE_APPLICATION_CREDENTIALS file:', err.message);
        process.exit(1);
      }
    } else if (fs.existsSync(path.join(process.cwd(), 'service-account.json'))) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf8'));
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || 'pamborina-app',
        });
        console.log('🔑 Initialized using local service-account.json file');
      } catch (err: any) {
        console.error('❌ Failed to read service-account.json:', err.message);
        process.exit(1);
      }
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: 'pamborina-app',
      });
      console.log('🔑 Initialized using Application Default Credentials');
    }
  } else {
    adminApp = getApps()[0];
  }

  const authAdmin = getAuth(adminApp);

  try {
    // 1. Verify that the user exists in Firebase Authentication (by email or UID)
    let userRecord;
    if (targetIdentifier.includes('@')) {
      console.log(`🔍 Looking up user by email: "${targetIdentifier}"...`);
      userRecord = await authAdmin.getUserByEmail(targetIdentifier);
    } else {
      console.log(`🔍 Looking up user by UID: "${targetIdentifier}"...`);
      userRecord = await authAdmin.getUser(targetIdentifier);
    }

    console.log(`✅ User found:`);
    console.log(`   - UID: ${userRecord.uid}`);
    console.log(`   - Email: ${userRecord.email}`);
    console.log(`   - Display Name: ${userRecord.displayName || 'N/A'}`);
    console.log(`   - Existing Claims:`, userRecord.customClaims || {});

    // 2. Set Custom User Claims { admin: true }
    console.log('\n⏳ Assigning { admin: true } custom claim...');
    await authAdmin.setCustomUserClaims(userRecord.uid, {
      ...(userRecord.customClaims || {}),
      admin: true,
    });

    // 3. Verify the updated claim
    const updatedUser = await authAdmin.getUser(userRecord.uid);
    console.log(`✅ Claim successfully assigned and verified!`);
    console.log(`   - Updated Claims:`, updatedUser.customClaims);

    console.log('\n======================================================');
    console.log(`🎉 SUCCESS: Admin role granted to ${updatedUser.email}`);
    console.log('   Custom Claims: { admin: true }');
    console.log('   The user can now log into the admin dashboard at /admin');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('\n❌ Failed to set admin claim:', error.message || error);
    process.exit(1);
  }
}

setAdminRole();
