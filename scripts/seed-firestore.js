const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, GeoPoint, deleteDoc } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

async function seedHotspots() {
  console.log('🚀 Iniciando semente (seed) do Firestore via Client SDK...');
  console.log('⏳ Aguardando 3 segundos para propagação das regras...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const hotspotsRef = collection(db, 'demand_hotspots');

    // Verificar se já existem hotspots
    const snapshot = await getDocs(hotspotsRef);
    if (!snapshot.empty) {
      console.log(`ℹ️ Já existem ${snapshot.size} hotspots. Limpando para garantir dados consistentes...`);
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }
      console.log('✅ Coleção limpa.');
    }

    const initialHotspots = [
      {
        name: 'Centro Comercial',
        center: new GeoPoint(-23.5505, -46.6333),
        radiusMeters: 1000,
        demandLevel: 'high',
        active: true,
        message: 'Alta demanda de pedidos no Centro! Muitos clientes aguardando.',
        updatedAt: new Date().toISOString()
      },
      {
        name: 'Av. Paulista',
        center: new GeoPoint(-23.5614, -46.6559),
        radiusMeters: 800,
        demandLevel: 'critical',
        active: true,
        message: 'Demanda CRÍTICA na região da Paulista. Ganhos extras ativos!',
        updatedAt: new Date().toISOString()
      },
      {
        name: 'Vila Madalena',
        center: new GeoPoint(-23.5552, -46.6865),
        radiusMeters: 1200,
        demandLevel: 'medium',
        active: true,
        message: 'Região boêmia com aumento de pedidos para o fim de semana.',
        updatedAt: new Date().toISOString()
      }
    ];

    for (const hotspot of initialHotspots) {
      const docRef = await addDoc(hotspotsRef, hotspot);
      console.log(`✅ Hotspot adicionado: ${hotspot.name} (ID: ${docRef.id})`);
    }

    console.log('✨ Semente finalizada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao semear Firestore:', error);
    process.exit(1);
  }
}

seedHotspots();
