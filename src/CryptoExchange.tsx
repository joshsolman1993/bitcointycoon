import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, doc, updateDoc, addDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar"; // Added Sidebar import

const CryptoExchange: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [btcPrice, setBtcPrice] = useState(45230);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const updatePrice = () => {
      const changePercent = (Math.random() * 10 - 5) / 100;
      setBtcPrice((prev) => {
        const newPrice = prev * (1 + changePercent);
        return Math.round(newPrice);
      });
    };

    updatePrice();
    const interval = setInterval(updatePrice, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !userData) return;
    if (userData.usdBalance === undefined) {
      const userRef = doc(db, `users/${user.uid}`);
      updateDoc(userRef, { usdBalance: 10000 });
    }
  }, [user, userData]);

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const handleBuy = async () => {
    if (!user || !userData || amount <= 0) return;

    const cost = amount * btcPrice;
    const usdBalance = userData.usdBalance ?? 0;
    if (usdBalance < cost) {
      toast.error("Insufficient USD balance to buy BTC!");
      return;
    }

    try {
      const userRef = doc(db, `users/${user.uid}`);
      await updateDoc(userRef, {
        btcBalance: userData.btcBalance + amount,
        usdBalance: usdBalance - cost,
        transactions: (userData.transactions || 0) + 1,
      });

      await addDoc(collection(db, `users/${user.uid}/transactions`), {
        type: "buy",
        amount,
        price: btcPrice,
        timestamp: Date.now(),
      });

      const weekNumber = getWeekNumber(new Date());
      await addDoc(collection(db, `users/${user.uid}/weeklyStats`), {
        week: `2025-${weekNumber}`,
        btcEarned: amount,
        questsCompleted: 0,
      });

      toast.success(`Bought ${amount} BTC for $${cost}!`);
      setAmount(0);
    } catch (error) {
      toast.error("Failed to buy BTC!");
      console.error(error);
    }
  };

  const handleSell = async () => {
    if (!user || !userData || amount <= 0) return;

    if (userData.btcBalance < amount) {
      toast.error("Insufficient BTC balance to sell!");
      return;
    }

    const revenue = amount * btcPrice;
    const usdBalance = userData.usdBalance ?? 0;

    try {
      const userRef = doc(db, `users/${user.uid}`);
      await updateDoc(userRef, {
        btcBalance: userData.btcBalance - amount,
        usdBalance: usdBalance + revenue,
        transactions: (userData.transactions || 0) + 1,
      });

      await addDoc(collection(db, `users/${user.uid}/transactions`), {
        type: "sell",
        amount,
        price: btcPrice,
        timestamp: Date.now(),
      });

      const weekNumber = getWeekNumber(new Date());
      await addDoc(collection(db, `users/${user.uid}/weeklyStats`), {
        week: `2025-${weekNumber}`,
        btcEarned: -amount,
        questsCompleted: 0,
      });

      toast.success(`Sold ${amount} BTC for $${revenue}!`);
      setAmount(0);
    } catch (error) {
      toast.error("Failed to sell BTC!");
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
            Crypto Exchange
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-semibold text-gray-400">Current BTC Price</p>
              <p className="text-lg">${btcPrice}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Your USD Balance</p>
              <p className="text-lg">${userData?.usdBalance ?? 0}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 mb-2">Amount (BTC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="0"
              step="0.01"
              className="w-full p-2 rounded bg-gray-800 text-white border-neon-blue"
              placeholder="Enter amount to buy/sell"
            />
          </div>

          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleBuy}
              className="px-4 py-2 bg-neon-green text-black rounded hover:bg-neon-green/80 transition"
            >
              Buy BTC
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleSell}
              className="px-4 py-2 bg-neon-red text-black rounded hover:bg-neon-red/80 transition"
            >
              Sell BTC
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CryptoExchange;
