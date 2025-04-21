import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar"; // Added Sidebar import

interface Quest {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  reward: { btc: number; miningPower: number };
}

interface UserQuest {
  questId: string;
  status: "accepted" | "completed";
  progress: number;
}

interface Farm {
  id: string;
  status: string;
}

const Quests: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    const questsRef = collection(db, "quests");
    const unsubscribe = onSnapshot(questsRef, (snapshot) => {
      const questsData: Quest[] = snapshot.docs.map(
        (doc) => doc.data() as Quest
      );
      setQuests(questsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userQuestsRef = collection(db, `users/${user.uid}/quests`);
    const unsubscribe = onSnapshot(userQuestsRef, (snapshot) => {
      const userQuestsData: UserQuest[] = snapshot.docs.map(
        (doc) => doc.data() as UserQuest
      );
      setUserQuests(userQuestsData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const farmsRef = collection(db, `users/${user.uid}/farms`);
    const unsubscribe = onSnapshot(farmsRef, (snapshot) => {
      const farmsData: Farm[] = snapshot.docs.map((doc) => doc.data() as Farm);
      setFarms(farmsData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !userData) return;

    userQuests.forEach(async (userQuest) => {
      if (userQuest.status !== "accepted") return;

      const quest = quests.find((q) => q.id === userQuest.questId);
      if (!quest) return;

      let progress = userQuest.progress;
      let isCompleted = false;

      if (quest.type === "farm-count") {
        const activeFarms = farms.filter(
          (farm) => farm.status === "Active"
        ).length;
        progress = activeFarms;
        isCompleted = progress >= quest.target;
      } else if (quest.type === "btc-earned") {
        progress = userData.btcBalance - 10;
        isCompleted = progress >= quest.target;
      }

      const userQuestRef = doc(
        db,
        `users/${user.uid}/quests`,
        userQuest.questId
      );
      await updateDoc(userQuestRef, { progress });

      if (isCompleted) {
        await updateDoc(userQuestRef, { status: "completed" });
        const userRef = doc(db, `users/${user.uid}`);
        await updateDoc(userRef, {
          btcBalance: userData.btcBalance + quest.reward.btc,
          miningPower: (userData.miningPower || 0) + quest.reward.miningPower,
        });

        const weekNumber = getWeekNumber(new Date());
        const weeklyStatsRef = doc(
          db,
          `users/${user.uid}/weeklyStats`,
          `2025-${weekNumber}`
        );
        await addDoc(collection(db, `users/${user.uid}/weeklyStats`), {
          week: `2025-${weekNumber}`,
          btcEarned: quest.reward.btc,
          questsCompleted: 1,
        });

        toast.success(
          `Quest completed: ${quest.name}! Reward: ${quest.reward.btc} BTC, ${quest.reward.miningPower} TH/s`
        );
      }
    });
  }, [user, userData, userQuests, quests, farms]);

  const handleAcceptQuest = async (quest: Quest) => {
    if (!user) return;
    const userQuestRef = doc(db, `users/${user.uid}/quests`, quest.id);
    await setDoc(userQuestRef, {
      questId: quest.id,
      status: "accepted",
      progress: 0,
    });
    toast.success(`Quest accepted: ${quest.name}`);
  };

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  return (
    <div className="min-h-screen relative">
      <div className="grid-bg" style={{ zIndex: -1 }}></div>
      <header className="bg-gradient p-4 flex justify-between items-center shadow-lg fixed w-full top-0 z-10 header-glow">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-orbitron text-neon-blue neon-text-shadow">
            Bitcoin Tycoon
          </h1>
          <span className="text-sm bg-gray-800 px-2 py-1 rounded neon-border">
            v1.0
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="font-semibold">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-sm text-gray-400">
              {userData?.btcBalance || 0} BTC
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>
      <Sidebar /> {/* Added Sidebar component */}
      <div className="ml-64 pt-20 px-4" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h2 className="text-xl font-orbitron text-neon-blue mb-4 neon-text-shadow">
            Quests
          </h2>
          {quests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quests.map((quest) => {
                const userQuest = userQuests.find(
                  (uq) => uq.questId === quest.id
                );
                const status = userQuest?.status || "available";
                const progress = userQuest?.progress || 0;

                return (
                  <motion.div
                    key={quest.id}
                    whileHover={{ scale: 1.03 }}
                    className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow"
                  >
                    <h3 className="text-lg font-orbitron text-neon-blue">
                      {quest.name}
                    </h3>
                    <p className="text-sm text-gray-400">{quest.description}</p>
                    <p className="text-sm mt-2">
                      Progress: {progress}/{quest.target}
                    </p>
                    <p className="text-sm mt-1">
                      Reward: {quest.reward.btc} BTC, {quest.reward.miningPower}{" "}
                      TH/s
                    </p>
                    {status === "available" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleAcceptQuest(quest)}
                        className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                      >
                        Accept
                      </motion.button>
                    )}
                    {status === "accepted" && (
                      <p className="text-sm text-neon-blue mt-2">
                        In Progress...
                      </p>
                    )}
                    {status === "completed" && (
                      <p className="text-sm text-green-400 mt-2">Completed!</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400">No quests available at the moment.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Quests;
