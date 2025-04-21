const admin = require("firebase-admin");

// Inicializálja a Firebase Admin SDK-t
const serviceAccount = require("../src/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Gyűjtemény rekurzív törlése
async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const querySnapshot = await collectionRef.get();

  const batchSize = 500;
  let batch = db.batch();
  let count = 0;

  for (const doc of querySnapshot.docs) {
    const subCollections = await doc.ref.listCollections();
    for (const subCollection of subCollections) {
      await deleteCollection(`${collectionPath}/${doc.id}/${subCollection.id}`);
    }

    batch.delete(doc.ref);
    count++;

    if (count >= batchSize) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

// Adatbázis teljes törlése
async function resetDatabase() {
  const collections = await db.listCollections();
  for (const collection of collections) {
    await deleteCollection(collection.id);
  }
  console.log("Database reset completed.");
}

// Adatbázis inicializálása
async function initializeDatabase() {
  // 1. Syndicates inicializálása
  const syndicatesRef = db.collection("syndicates");
  const syndicates = [
    {
      id: "syndicate1",
      name: "Crypto Kings",
      description:
        "A powerful syndicate focused on mining massive amounts of BTC.",
      goal: { type: "totalMinedBtc", target: 1000 },
      progress: 0,
      reward: { btc: 50, miningPower: 20 },
      members: [],
    },
    {
      id: "syndicate2",
      name: "Darkweb Elites",
      description: "Elite hackers working together to dominate the market.",
      goal: { type: "totalMinedBtc", target: 500 },
      progress: 0,
      reward: { btc: 30, miningPower: 10 },
      members: [],
    },
  ];

  for (const syndicate of syndicates) {
    await syndicatesRef.doc(syndicate.id).set(syndicate);
    console.log(`Added syndicate: ${syndicate.name}`);
  }

  // 2. Tesztfelhasználók inicializálása
  const usersRef = db.collection("users");
  const users = [
    {
      id: "user1",
      email: "user1@example.com",
      nickname: "MinerOne",
      btcBalance: 100,
      miningPower: 50,
      totalMinedBtc: 200,
      rank: "Beginner",
      transactions: 5,
    },
    {
      id: "user2",
      email: "user2@example.com",
      nickname: "CryptoKing",
      btcBalance: 300,
      miningPower: 120,
      totalMinedBtc: 600,
      rank: "Advanced",
      transactions: 15,
    },
    {
      id: "user3",
      email: "user3@example.com",
      nickname: "DarkwebPro",
      btcBalance: 150,
      miningPower: 80,
      totalMinedBtc: 300,
      rank: "Intermediate",
      transactions: 8,
    },
  ];

  for (const user of users) {
    await usersRef.doc(user.id).set(user);
    console.log(`Added user: ${user.nickname}`);

    // Inicializáljuk a felhasználó syndicate algyűjteményét (üres tagság)
    const userSyndicateRef = usersRef
      .doc(user.id)
      .collection("syndicate")
      .doc("data");
    await userSyndicateRef.set({
      syndicateId: "",
      contribution: 0,
    });
    console.log(`Initialized syndicate data for user: ${user.nickname}`);

    // Inicializáljuk a felhasználó status algyűjteményét (esemény státusz)
    const userStatusRef = usersRef
      .doc(user.id)
      .collection("status")
      .doc("eventStatus");
    await userStatusRef.set({
      inPrison: false,
      prisonEndTime: 0,
    });
    console.log(`Initialized event status for user: ${user.nickname}`);

    // Inicializáljuk a felhasználó NEON algyűjteményét
    const userNeonRef = usersRef.doc(user.id).collection("neon").doc("data");
    await userNeonRef.set({
      neonLevel: 1,
      loyaltyPoints: 0,
      shards: 0,
      activeQuests: [],
      unlockedBonuses: [],
      legacyQuestProgress: 0,
      shadowThreatLevel: 0,
      shadowAttackCooldown: 0,
      cyberArenaCooldown: 0,
    });
    console.log(`Initialized NEON data for user: ${user.nickname}`);
  }

  // 3. ChatMessages inicializálása
  for (const syndicate of syndicates) {
    const chatRef = db.collection(
      `chatMessages/syndicate_${syndicate.id}/messages`
    );
    console.log(`Initialized chat for syndicate: ${syndicate.name}`);
  }

  // 4. CryptoBankRobbery event inicializálása
  const now = Date.now();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Hétfő
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6); // Vasárnap
  endOfWeek.setHours(23, 59, 59, 999);

  const eventRef = db.collection("events").doc("cryptoBankRobbery");
  await eventRef.set({
    eventId: `week_${new Date().getFullYear()}_${Math.ceil(
      new Date().getDate() / 7
    )}`,
    startTime: startOfWeek.getTime(),
    endTime: endOfWeek.getTime(),
    stage: "observation",
    progress: 0,
    participants: [],
    bankDefenses: { firewall: 80, guards: 50, alarms: 70 },
    successChance: 0,
    reward: { btc: 500, miningPower: 100 },
  });
  console.log("Initialized CryptoBankRobbery event.");

  // 5. NEON Messages inicializálása (üresen)
  const neonMessagesRef = db.collection("neonMessages");
  console.log("Initialized NEON Messages collection.");

  // 6. SHADOW Attacks inicializálása (üresen)
  const shadowAttacksRef = db.collection("shadowAttacks");
  console.log("Initialized SHADOW Attacks collection.");

  // 7. Cyber Arena Results inicializálása (üresen)
  const cyberArenaResultsRef = db.collection("cyberArenaResults");
  console.log("Initialized Cyber Arena Results collection.");

  console.log("Database initialization completed.");
}

// Fő függvény
async function resetAndInitialize() {
  try {
    console.log("Starting database reset...");
    await resetDatabase();
    console.log("Starting database initialization...");
    await initializeDatabase();
    console.log("Reset and initialization completed successfully.");
  } catch (error) {
    console.error("Error during reset and initialization:", error);
  } finally {
    process.exit();
  }
}

resetAndInitialize();
