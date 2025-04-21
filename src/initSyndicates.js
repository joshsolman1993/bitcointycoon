const admin = require("firebase-admin");

// Inicializálja a Firebase Admin SDK-t
// Helyettesítsd a serviceAccountKey.json fájlt a saját Firebase Admin SDK kulcsoddal
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function initSyndicates() {
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

  try {
    for (const syndicate of syndicates) {
      await syndicatesRef.doc(syndicate.id).set(syndicate);
      console.log(`Successfully added syndicate: ${syndicate.name}`);
    }
    console.log("Syndicates initialization completed.");
  } catch (error) {
    console.error("Error initializing syndicates:", error);
  } finally {
    process.exit();
  }
}

initSyndicates();
