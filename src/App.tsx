import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Landing from "./Landing";
import Login from "./Login";
import Register from "./Register";
import Buildings from "./Buildings";
import FarmDetails from "./FarmDetails";
import DarkwebMarket from "./DarkwebMarket";
import Quests from "./Quests";
import CryptoExchange from "./CryptoExchange";
import Profile from "./Profile";
import Leaderboard from "./Leaderboard";
import Syndicates from "./Syndicates";
import CryptoBankRobbery from "./CryptoBankRobbery";
import Neon from "./Neon"; // Added Neon import
import Sidebar from "./Sidebar";

interface Farm {
  id: string;
  name: string;
  level: number;
  miningPower: number;
  status: string;
  constructionEnd?: number;
}

const Dashboard: React.FC = () => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [farmsUnderConstruction, setFarmsUnderConstruction] = useState<Farm[]>(
    []
  );
  const [timeLeftMap, setTimeLeftMap] = useState<{ [key: string]: number }>({});

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully!");
  };

  const miningPowerValue = userData?.miningPower
    ? Number(userData.miningPower)
    : 0;
  const miningPower = isNaN(miningPowerValue)
    ? "0"
    : miningPowerValue.toFixed(2);

  useEffect(() => {
    if (!user) return;

    const farmsRef = collection(db, `users/${user.uid}/farms`);
    const unsubscribe = onSnapshot(farmsRef, (snapshot) => {
      const farmsData: Farm[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Farm[];

      const underConstruction = farmsData.filter(
        (farm) => farm.status === "Under Construction"
      );
      setFarmsUnderConstruction(underConstruction);

      const newTimeLeftMap: { [key: string]: number } = {};
      underConstruction.forEach((farm) => {
        if (farm.constructionEnd) {
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
            onClick={handleLogout}
            className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
          >
            Logout
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
            Profile Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="font-semibold text-gray-400">Name</p>
              <p className="text-lg">
                {userData?.nickname || user?.email?.split("@")[0] || "User"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Rank</p>
              <p className="text-lg">{userData?.rank || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Mining Power</p>
              <p className="text-lg">{miningPower} TH/s</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Transactions</p>
              <p className="text-lg">{userData?.transactions || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h3 className="text-lg font-orbitron text-neon-blue mb-4 neon-text-shadow">
            Farms Under Construction
          </h3>
          {farmsUnderConstruction.length > 0 ? (
            <ul className="space-y-4">
              {farmsUnderConstruction.map((farm) => (
                <li key={farm.id} className="flex items-start space-x-3">
                  <span className="text-neon-blue">•</span>
                  <p>
                    {farm.name} - Time left:{" "}
                    {timeLeftMap[farm.id] !== undefined
                      ? `${timeLeftMap[farm.id]}s`
                      : "N/A"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">
              No farms are currently under construction.
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {[
            { title: "Buildings", icon: "🏢", color: "neon-blue" },
            { title: "Darkweb Market", icon: "🛒", color: "neon-purple" },
            { title: "Crypto Exchange", icon: "💸", color: "neon-green" },
          ].map((card) => (
            <motion.div
              key={card.title}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 15px rgba(0, 242, 255, 0.5)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`bg-gradient p-6 rounded-lg neon-border cursor-pointer border-${card.color} card-inner-shadow`}
              onClick={() =>
                navigate(`/${card.title.toLowerCase().replace(" ", "-")}`)
              }
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl icon-glow">{card.icon}</span>
                <div>
                  <h3
                    className={`text-lg font-orbitron text-${card.color} neon-text-shadow`}
                  >
                    {card.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient p-6 rounded-lg neon-border card-inner-shadow"
          >
            <h3 className="text-lg font-orbitron text-neon-blue mb-4 neon-text-shadow">
              Market Stats
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-400">BTC Price</p>
                <p className="text-lg">$45,230</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Network Hashrate</p>
                <p className="text-lg">180 EH/s</p>
              </div>
              <div className="h-32 bg-gray-800 rounded flex items-center justify-center text-gray-400">
                [Placeholder Chart]
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient p-6 rounded-lg neon-border card-inner-shadow"
          >
            <h3 className="text-lg font-orbitron text-neon-blue mb-4 neon-text-shadow">
              Notifications
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <span className="text-neon-blue">•</span>
                <p>New Darkweb Market item available: Quantum Encryptor.</p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-neon-blue">•</span>
                <p>Your mining farm upgraded to Tier 3.</p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-neon-blue">•</span>
                <p>Syndicate event starts in 2 hours!</p>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buildings"
        element={
          <ProtectedRoute>
            <Buildings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/darkweb-market"
        element={
          <ProtectedRoute>
            <DarkwebMarket />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quests"
        element={
          <ProtectedRoute>
            <Quests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crypto-exchange"
        element={
          <ProtectedRoute>
            <CryptoExchange />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/syndicates"
        element={
          <ProtectedRoute>
            <Syndicates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crypto-bank-robbery"
        element={
          <ProtectedRoute>
            <CryptoBankRobbery />
          </ProtectedRoute>
        }
      />
      <Route
        path="/neon"
        element={
          <ProtectedRoute>
            <Neon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farm/:farmId"
        element={
          <ProtectedRoute>
            <FarmDetails />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
