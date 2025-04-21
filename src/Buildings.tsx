import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar"; // Added Sidebar import

interface Farm {
  id: string;
  name: string;
  level: number;
  cost: number;
  miningPower: number;
  buildTime: number;
  status: string;
  constructionEnd?: number;
}

const Buildings: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [timeLeftMap, setTimeLeftMap] = useState<{ [key: string]: number }>({});

  const farmTemplates: Omit<Farm, "id" | "status" | "constructionEnd">[] = [
    { name: "Small Farm", level: 1, cost: 10, miningPower: 5, buildTime: 300 },
    {
      name: "Medium Farm",
      level: 2,
      cost: 50,
      miningPower: 20,
      buildTime: 600,
    },
    {
      name: "Large Farm",
      level: 3,
      cost: 200,
      miningPower: 100,
      buildTime: 1200,
    },
  ];

  useEffect(() => {
    if (!user) return;

    const farmsRef = collection(db, `users/${user.uid}/farms`);
    const unsubscribe = onSnapshot(farmsRef, (snapshot) => {
      const farmsData: Farm[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Farm[];
      setFarms(farmsData);

      const newTimeLeftMap: { [key: string]: number } = {};
      farmsData.forEach((farm) => {
        if (farm.status === "Under Construction" && farm.constructionEnd) {
          const timeLeft = Math.max(
            0,
            Math.floor((farm.constructionEnd - Date.now()) / 1000)
          );
          newTimeLeftMap[farm.id] = timeLeft;
        }
      });
      setTimeLeftMap(newTimeLeftMap);
    });

    const timer = setInterval(() => {
      setTimeLeftMap((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((farmId) => {
          updated[farmId] = Math.max(0, updated[farmId] - 1);
        });
        return updated;
      });
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [user]);

  const handleBuildFarm = async (
    template: Omit<Farm, "id" | "status" | "constructionEnd">
  ) => {
    if (!user || !userData) return;

    const costMultiplier = userData.buildCostMultiplier || 1;
    const finalCost = template.cost * costMultiplier;

    if (userData.btcBalance < finalCost) {
      toast.error("Insufficient BTC balance to build this farm!");
      return;
    }

    const farmId = Date.now().toString();
    const constructionEnd = Date.now() + template.buildTime * 1000;

    const newFarm: Farm = {
      ...template,
      id: farmId,
      status: "Under Construction",
      constructionEnd,
    };

    try {
      const farmRef = doc(db, `users/${user.uid}/farms`, farmId);
      await setDoc(farmRef, newFarm);

      const userRef = doc(db, `users/${user.uid}`);
      await setDoc(
        userRef,
        { btcBalance: userData.btcBalance - finalCost },
        { merge: true }
      );

      toast.success(`Started building ${template.name}!`);
    } catch (error) {
      toast.error("Failed to start building farm!");
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
            Buildings
          </h2>
          <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
            Available Farms
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {farmTemplates.map((template) => (
              <motion.div
                key={template.name}
                whileHover={{ scale: 1.03 }}
                className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow"
              >
                <h3 className="text-lg font-orbitron text-neon-blue">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-400">Level: {template.level}</p>
                <p className="text-sm text-gray-400">
                  Cost: {template.cost * (userData?.buildCostMultiplier || 1)}{" "}
                  BTC
                </p>
                <p className="text-sm text-gray-400">
                  Mining Power: {template.miningPower} TH/s
                </p>
                <p className="text-sm text-gray-400">
                  Build Time: {template.buildTime} seconds
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleBuildFarm(template)}
                  className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                >
                  Build
                </motion.button>
              </motion.div>
            ))}
          </div>

          <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
            Your Farms
          </h3>
          {farms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {farms.map((farm) => (
                <motion.div
                  key={farm.id}
                  whileHover={{ scale: 1.03 }}
                  className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow cursor-pointer"
                  onClick={() => navigate(`/farm/${farm.id}`)}
                >
                  <h3 className="text-lg font-orbitron text-neon-blue">
                    {farm.name}
                  </h3>
                  <p className="text-sm text-gray-400">Level: {farm.level}</p>
                  <p className="text-sm text-gray-400">
                    Mining Power: {farm.miningPower} TH/s
                  </p>
                  <p className="text-sm text-gray-400">Status: {farm.status}</p>
                  {farm.status === "Under Construction" && (
                    <p className="text-sm text-gray-400">
                      Time Left:{" "}
                      {timeLeftMap[farm.id] !== undefined
                        ? `${timeLeftMap[farm.id]}s`
                        : "N/A"}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You have no farms yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Buildings;
