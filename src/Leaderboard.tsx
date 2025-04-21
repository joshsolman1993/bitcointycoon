import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";

interface User {
  id: string;
  nickname: string;
  btcBalance: number;
  miningPower: number;
  rank: string;
}

interface Syndicate {
  id: string;
  name: string;
  progress: number;
  goal: { type: string; target: number };
}

const Leaderboard: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("btcBalance", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: User[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syndicatesRef = collection(db, "syndicates");
    const q = query(syndicatesRef, orderBy("progress", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const syndicatesData: Syndicate[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Syndicate[];
      setSyndicates(syndicatesData);
    });
    return () => unsubscribe();
  }, []);

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

      <Sidebar />

      <div className="ml-64 pt-20 px-4" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h2 className="text-xl font-orbitron text-neon-blue mb-4 neon-text-shadow">
            Leaderboard
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-neon-blue border-b border-neon-blue">
                  <th className="p-2">Rank</th>
                  <th className="p-2">Player</th>
                  <th className="p-2">BTC Balance</th>
                  <th className="p-2">Mining Power</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-700 hover:bg-gray-800"
                  >
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{user.nickname}</td>
                    <td className="p-2">{user.btcBalance} BTC</td>
                    <td className="p-2">{user.miningPower} TH/s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h2 className="text-xl font-orbitron text-neon-blue mb-4 neon-text-shadow">
            Syndicate Leaderboard
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-neon-blue border-b border-neon-blue">
                  <th className="p-2">Rank</th>
                  <th className="p-2">Syndicate</th>
                  <th className="p-2">Progress</th>
                  <th className="p-2">Goal</th>
                </tr>
              </thead>
              <tbody>
                {syndicates.map((syndicate, index) => (
                  <tr
                    key={syndicate.id}
                    className="border-b border-gray-700 hover:bg-gray-800"
                  >
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{syndicate.name}</td>
                    <td className="p-2">{syndicate.progress}</td>
                    <td className="p-2">
                      {syndicate.goal.target}{" "}
                      {syndicate.goal.type === "totalMinedBtc" ? "BTC" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
