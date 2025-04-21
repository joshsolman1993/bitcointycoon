import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar"; // Added Sidebar import

interface Achievement {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  timestamp?: number;
}

interface Farm {
  id: string;
  status: string;
}

const Profile: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(userData?.nickname || "");
  const [avatar, setAvatar] = useState(userData?.avatar || "icon1");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [completedQuests, setCompletedQuests] = useState(0);
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    if (!user) return;

    const userAchievementsRef = collection(
      db,
      `users/${user.uid}/achievements`
    );
    const unsubscribe = onSnapshot(userAchievementsRef, (snapshot) => {
      const userAchievementsData: Achievement[] = snapshot.docs.map(
        (doc) => doc.data() as Achievement
      );
      setAchievements(userAchievementsData);

      const globalAchievementsRef = collection(db, "achievements");
      onSnapshot(globalAchievementsRef, async (globalSnapshot) => {
        const globalAchievements = globalSnapshot.docs.map(
          (doc) => doc.data() as Achievement
        );

        for (const achievement of globalAchievements) {
          const exists = userAchievementsData.some(
            (ua) => ua.id === achievement.id
          );
          if (!exists) {
            let completed = false;
            if (
              achievement.id === "first-transaction" &&
              (userData?.transactions || 0) >= 1
            ) {
              completed = true;
            } else if (
              achievement.id === "millionaire" &&
              (userData?.btcBalance || 0) >= 1000
            ) {
              completed = true;
            } else if (
              achievement.id === "quest-master" &&
              completedQuests >= 5
            ) {
              completed = true;
            }

            const achievementRef = doc(
              db,
              `users/${user.uid}/achievements`,
              achievement.id
            );
            await updateDoc(achievementRef, {
              ...achievement,
              completed,
              timestamp: completed ? Date.now() : undefined,
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, userData, completedQuests]);

  useEffect(() => {
    if (!user) return;

    const questsRef = collection(db, `users/${user.uid}/quests`);
    const q = query(questsRef, where("status", "==", "completed"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompletedQuests(snapshot.docs.length);
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

  const handleNicknameChange = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, `users/${user.uid}`);
      await updateDoc(userRef, { nickname });
      toast.success("Nickname updated!");
    } catch (error) {
      toast.error("Failed to update nickname!");
      console.error(error);
    }
  };

  const handleAvatarChange = async (newAvatar: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, `users/${user.uid}`);
      await updateDoc(userRef, { avatar: newAvatar });
      setAvatar(newAvatar);
      toast.success("Avatar updated!");
    } catch (error) {
      toast.error("Failed to update avatar!");
      console.error(error);
    }
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
              {userData?.nickname || user?.email?.split("@")[0] || "User"}
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
            Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-semibold text-gray-400">Nickname</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="p-2 rounded bg-gray-800 text-white border-neon-blue"
                  placeholder="Enter nickname"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleNicknameChange}
                  className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                >
                  Save
                </motion.button>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Avatar</p>
              <div className="flex space-x-2">
                {["icon1", "icon2", "icon3"].map((icon) => (
                  <motion.button
                    key={icon}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleAvatarChange(icon)}
                    className={`p-2 rounded ${
                      avatar === icon ? "border-neon-blue" : "border-gray-800"
                    }`}
                  >
                    <span className="text-2xl">
                      {icon === "icon1" ? "🧑‍💻" : icon === "icon2" ? "👨‍🚀" : "🦸"}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
            Stats
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="font-semibold text-gray-400">BTC Balance</p>
              <p className="text-lg">{userData?.btcBalance || 0} BTC</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">USD Balance</p>
              <p className="text-lg">${userData?.usdBalance ?? 0}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Mining Power</p>
              <p className="text-lg">{userData?.miningPower || 0} TH/s</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Transactions</p>
              <p className="text-lg">{userData?.transactions || 0}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Total Mined BTC</p>
              <p className="text-lg">{userData?.totalMinedBtc || 0} BTC</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Largest Transaction</p>
              <p className="text-lg">{userData?.largestTransaction || 0} BTC</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Completed Quests</p>
              <p className="text-lg">{completedQuests}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Active Farms</p>
              <p className="text-lg">
                {farms.filter((farm) => farm.status === "Active").length}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
            Achievements
          </h3>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  whileHover={{ scale: 1.03 }}
                  className={`p-4 rounded-lg border-neon-blue card-inner-shadow ${
                    achievement.completed ? "bg-green-900" : "bg-gray-800"
                  }`}
                >
                  <h4 className="text-md font-orbitron text-neon-blue">
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {achievement.description}
                  </p>
                  <p className="text-sm mt-1">
                    {achievement.completed ? "Completed" : "Not Completed"}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No achievements yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
