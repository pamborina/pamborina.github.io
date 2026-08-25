import { seedProductsToFirestore } from '../src/services/firestoreSeeder.js';
import { db } from '../src/lib/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function main() {
  console.log('🌱 Starting Pamborina Firestore Migration...');
  try {
    if (!db) {
      throw new Error('Firestore instance not initialized.');
    }

    const initialSnap = await getDocs(collection(db, 'products'));
    console.log(`Firestore documents before migration: ${initialSnap.size}`);

    const progress = await seedProductsToFirestore((p) => {
      console.log(`[Progress] Uploaded: ${p.uploaded}/${p.total} | Failed: ${p.failed}`);
    });

    const finalSnap = await getDocs(collection(db, 'products'));
    console.log(`Firestore documents after migration: ${finalSnap.size}`);

    console.log('\n--- MIGRATION SUMMARY ---');
    console.log(`Total local products: ${progress.total}`);
    console.log(`Successfully migrated: ${progress.uploaded}`);
    console.log(`Failed: ${progress.failed}`);
    console.log(`Firestore collection size: ${finalSnap.size}`);

    process.exit(progress.failed > 0 ? 1 : 0);
  } catch (err: any) {
    console.error('❌ Migration blocked or failed:', err?.message || err);
    process.exit(1);
  }
}

main();
