import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar"; // Added Sidebar import

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  effect: { type: string; value: number };
}

const DarkwebMarket: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const itemsRef = collection(db, "darkwebItems");
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const itemsData: Item[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];
      setItems(itemsData);
    });
    return () => unsubscribe();
  }, []);

  const handlePurchase = async (item: Item) => {
    if (!user || !userData) return;

    if (userData.btcBalance < item.price) {
      toast.error("Insufficient BTC balance to purchase this item!");
      return;
    }

    try {
      const userRef = doc(db, `users/${user.uid}`);
      const newBalance = userData.btcBalance - item.price;
      const updateData: any = { btcBalance: newBalance };

      if (item.effect.type === "miningPower") {
        updateData.miningPower =
          (userData.miningPower || 0) + item.effect.value;
      } else if (item.effect.type === "buildCostMultiplier") {
        updateData.buildCostMultiplier =
          (userData.buildCostMultiplier || 1) * item.effect.value;
      }

      await updateDoc(userRef, updateData);
      toast.success(`Purchased ${item.name}!`);
    } catch (error) {
      toast.error("Failed to purchase item!");
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
            Darkweb Market
          </h2>
          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.03 }}
                  className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow"
                >
                  <h3 className="text-lg font-orbitron text-neon-blue">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                  <p className="text-sm text-gray-400">
                    Price: {item.price} BTC
                  </p>
                  <p className="text-sm text-gray-400">
                    Effect:{" "}
                    {item.effect.type === "miningPower"
                      ? `+${item.effect.value} TH/s`
                      : `Build Cost x${item.effect.value}`}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handlePurchase(item)}
                    className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                  >
                    Purchase
                  </motion.button>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No items available at the moment.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DarkwebMarket;
