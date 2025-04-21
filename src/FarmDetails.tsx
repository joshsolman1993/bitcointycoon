import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";

interface Farm {
  id: string;
  name: string;
  level: number;
  miningPower: number;
  status: string;
}

const FarmDetails: React.FC = () => {
  const { user, userData } = useAuth();
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<Farm | null>(null);

  // Firestore subscription to farm details
  useEffect(() => {
    if (!user || !farmId) return;

    const farmRef = doc(db, `users/${user.uid}/farms/${farmId}`);
    const unsubscribe = onSnapshot(farmRef, (doc) => {
      if (doc.exists()) {
        setFarm({ id: doc.id, ...doc.data() } as Farm);
      } else {
        navigate("/buildings");
      }
    });

    return () => unsubscribe();
  }, [user, farmId, navigate]);

  if (!farm) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }

  // Calculate additional details
  const energyConsumption = farm.level * 10; // 10 kW per level
  const dailyProfit = farm.miningPower * 0.01; // 0.01 BTC per TH/s per day
  const maintenanceCost = farm.level * 0.05; // 0.05 BTC per level per month

  return (
    <div className="min-h-screen relative">
      {/* Grid Background */}
      <div className="grid-bg" style={{ zIndex: -1 }}></div>

      {/* Header */}
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
            onClick={() => navigate("/buildings")}
            className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
          >
            Back to Buildings
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className="fixed top-16 left-0 h-[calc(100%-4rem)] w-64 bg-gradient shadow-lg z-20">
        <nav className="p-4 mt-4">
          <ul className="space-y-2">
            {[
              { name: "Dashboard", icon: "🏠", path: "/dashboard" },
              { name: "Buildings", icon: "🏢", path: "/buildings" },
              { name: "Darkweb Market", icon: "🛒", path: "/darkweb-market" },
              { name: "Crypto Exchange", icon: "💸", path: "/crypto-exchange" },
              { name: "Syndicates", icon: "🤝", path: "/syndicates" },
            ].map((item) => (
              <motion.li
                key={item.name}
                whileHover={{ scale: 1.05 }}
                className={`flex items-center p-3 rounded hover:text-neon-blue transition-colors cursor-pointer ${
                  item.path === "/buildings" ? "text-neon-blue" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                <span className="font-orbitron">{item.name}</span>
              </motion.li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 pt-20 px-4" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h2 className="text-xl font-orbitron text-neon-blue mb-4 neon-text-shadow">
            {farm.name} Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold text-gray-400">Level</p>
              <p className="text-lg">{farm.level}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Mining Power</p>
              <p className="text-lg">{farm.miningPower.toFixed(2)} TH/s</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Status</p>
              <p className="text-lg">{farm.status}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Energy Consumption</p>
              <p className="text-lg">{energyConsumption} kW</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Daily Profit</p>
              <p className="text-lg">{dailyProfit.toFixed(3)} BTC</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Maintenance Cost</p>
              <p className="text-lg">{maintenanceCost.toFixed(2)} BTC/month</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FarmDetails;
