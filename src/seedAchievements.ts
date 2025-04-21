import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Achievement {
  id: string;
  name: string;
  description: string;
}

const achievements: Achievement[] = [
  {
    id: 'first-transaction',
    name: 'First Transaction',
    description: 'Complete your first transaction.',
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Earn 1000 BTC.',
  },
  {
    id: 'quest-master',
    name: 'Quest Master',
    description: 'Complete 5 quests.',
  },
];

const seedAchievements = async () => {
  try {
    for (const achievement of achievements) {
      const achievementRef = doc(db, 'achievements', achievement.id);
      await setDoc(achievementRef, achievement);
      console.log(`Successfully added achievement: ${achievement.name}`);
    }
    console.log('All achievements have been seeded successfully!');
  } catch (error) {
    console.error('Error seeding achievements:', error);
  }
};

seedAchievements();