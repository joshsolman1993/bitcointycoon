import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDoc,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";

interface Syndicate {
  id: string;
  name: string;
  description: string;
  goal: { type: string; target: number };
  progress: number;
  reward: { btc: number; miningPower: number };
  members: string[];
}

interface UserSyndicate {
  syndicateId: string;
  contribution: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

const Syndicates: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
  const [userSyndicate, setUserSyndicate] = useState<UserSyndicate | null>(
    null
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load syndicates
  useEffect(() => {
    const syndicatesRef = collection(db, "syndicates");
    const unsubscribe = onSnapshot(syndicatesRef, (snapshot) => {
      const syndicatesData: Syndicate[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Syndicate[];
      setSyndicates(syndicatesData);
    });
    return () => unsubscribe();
  }, []);

  // Load user's syndicate data
  useEffect(() => {
    if (!user) return;
    const userSyndicateRef = doc(db, `users/${user.uid}/syndicate`, "data");
    const unsubscribe = onSnapshot(userSyndicateRef, (doc) => {
      if (doc.exists()) {
        setUserSyndicate(doc.data() as UserSyndicate);
      } else {
        setUserSyndicate(null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Load chat messages
  useEffect(() => {
    if (!userSyndicate || !userSyndicate.syndicateId) {
      setChatMessages([]);
      return;
    }

    const chatRef = collection(
      db,
      `chatMessages/syndicate_${userSyndicate.syndicateId}/messages`
    );
    const q = query(chatRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setChatMessages(messages);
    });
    return () => unsubscribe();
  }, [userSyndicate]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Track contribution and update syndicate progress
  useEffect(() => {
    if (!user || !userData || !userSyndicate) return;

    const syndicate = syndicates.find(
      (s) => s.id === userSyndicate.syndicateId
    );
    if (!syndicate) return;

    const updateSyndicateProgress = async () => {
      let contribution = userSyndicate.contribution || 0;
      let newContribution = contribution;

      if (syndicate.goal.type === "totalMinedBtc") {
        newContribution = userData.totalMinedBtc || 0;
      }

      if (newContribution !== contribution) {
        const userSyndicateRef = doc(db, `users/${user.uid}/syndicate`, "data");
        await updateDoc(userSyndicateRef, { contribution: newContribution });

        const syndicateRef = doc(db, "syndicates", syndicate.id);
        const newProgress = syndicate.members.reduce((total, memberId) => {
          if (memberId === user.uid) {
            return total + (newContribution - contribution);
          }
          return total;
        }, syndicate.progress || 0);

        await updateDoc(syndicateRef, { progress: newProgress });

        if (newProgress >= syndicate.goal.target) {
          for (const memberId of syndicate.members) {
            const memberRef = doc(db, `users/${memberId}`);
            const memberSyndicateRef = doc(
              db,
              `users/${memberId}/syndicate`,
              "data"
            );
            const memberDoc = await getDoc(memberRef);
            const memberData = memberDoc.exists() ? memberDoc.data() : {};
            await updateDoc(memberRef, {
              btcBalance: (memberData?.btcBalance || 0) + syndicate.reward.btc,
              miningPower:
                (memberData?.miningPower || 0) + syndicate.reward.miningPower,
            });
            await setDoc(memberSyndicateRef, {
              syndicateId: "",
              contribution: 0,
            });
          }

          await updateDoc(syndicateRef, { progress: 0, members: [] });
          toast.success(
            `Syndicate goal completed! Reward: ${syndicate.reward.btc} BTC, ${syndicate.reward.miningPower} TH/s`
          );
        }
      }
    };

    updateSyndicateProgress().catch((error) => {
      console.error("Error updating syndicate progress:", error);
      toast.error("Failed to update syndicate progress!");
    });
  }, [user, userData, userSyndicate, syndicates]);

  const handleJoinSyndicate = async (syndicate: Syndicate) => {
    if (!user) return;
    if (userSyndicate) {
      toast.error(
        "You are already in a syndicate! Leave your current syndicate to join another."
      );
      return;
    }

    try {
      const syndicateRef = doc(db, "syndicates", syndicate.id);
      await updateDoc(syndicateRef, {
        members: arrayUnion(user.uid),
      });

      const userSyndicateRef = doc(db, `users/${user.uid}/syndicate`, "data");
      await setDoc(userSyndicateRef, {
        syndicateId: syndicate.id,
        contribution: 0,
      });

      toast.success(`Joined ${syndicate.name}!`);
    } catch (error) {
      toast.error("Failed to join syndicate!");
      console.error(error);
    }
  };

  const handleLeaveSyndicate = async () => {
    if (!user || !userSyndicate) return;

    try {
      const syndicateRef = doc(db, "syndicates", userSyndicate.syndicateId);
      await updateDoc(syndicateRef, {
        members: arrayRemove(user.uid),
      });

      const userSyndicateRef = doc(db, `users/${user.uid}/syndicate`, "data");
      await setDoc(userSyndicateRef, {
        syndicateId: "",
        contribution: 0,
      });

      toast.success("Left the syndicate!");
    } catch (error) {
      toast.error("Failed to leave syndicate!");
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userSyndicate || !newMessage.trim()) return;

    try {
      const chatRef = collection(
        db,
        `chatMessages/syndicate_${userSyndicate.syndicateId}/messages`
      );
      await addDoc(chatRef, {
        userId: user.uid,
        userName: userData?.nickname || user?.email?.split("@")[0] || "User",
        message: newMessage.trim(),
        timestamp: Date.now(),
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message!");
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

      <Sidebar />

      <div className="ml-64 pt-20 px-4" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient p-6 rounded-lg neon-border mb-4 card-inner-shadow"
        >
          <h2 className="text-xl font-orbitron text-neon-blue mb-4 neon-text-shadow">
            Syndicates
          </h2>

          {userSyndicate && userSyndicate.syndicateId ? (
            <div className="mb-4">
              <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                Your Syndicate
              </h3>
              {syndicates
                .filter(
                  (syndicate) => syndicate.id === userSyndicate.syndicateId
                )
                .map((syndicate) => (
                  <motion.div
                    key={syndicate.id}
                    whileHover={{ scale: 1.03 }}
                    className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow"
                  >
                    <h3 className="text-lg font-orbitron text-neon-blue">
                      {syndicate.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {syndicate.description}
                    </p>
                    <p className="text-sm text-gray-400">
                      Goal:{" "}
                      {syndicate.goal.type === "totalMinedBtc" ? "Mine" : ""}{" "}
                      {syndicate.goal.target}{" "}
                      {syndicate.goal.type === "totalMinedBtc" ? "BTC" : ""}
                    </p>
                    <p className="text-sm text-gray-400">
                      Progress: {syndicate.progress}/{syndicate.goal.target}
                    </p>
                    <p className="text-sm text-gray-400">
                      Your Contribution: {userSyndicate.contribution}
                    </p>
                    <p className="text-sm text-gray-400">
                      Reward: {syndicate.reward.btc} BTC,{" "}
                      {syndicate.reward.miningPower} TH/s
                    </p>
                    <p className="text-sm text-gray-400">
                      Members: {syndicate.members.length}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleLeaveSyndicate}
                      className="mt-2 px-4 py-2 bg-neon-red text-black rounded hover:bg-neon-red/80 transition"
                    >
                      Leave Syndicate
                    </motion.button>

                    {/* Chat Section */}
                    <div className="mt-4">
                      <h4 className="text-md font-orbitron text-neon-blue mb-2 neon-text-shadow">
                        Syndicate Chat
                      </h4>
                      <div className="bg-gray-900 p-4 rounded-lg border-neon-blue h-64 overflow-y-auto">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="mb-2">
                            <span className="text-sm text-neon-blue font-semibold">
                              [{new Date(msg.timestamp).toLocaleTimeString()}]{" "}
                              {msg.userName}:
                            </span>
                            <span className="text-sm text-gray-300">
                              {" "}
                              {msg.message}
                            </span>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                          className="flex-1 p-2 bg-gray-800 text-white rounded border-neon-blue"
                          placeholder="Type a message..."
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={handleSendMessage}
                          className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                        >
                          Send
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                Available Syndicates
              </h3>
              {syndicates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {syndicates.map((syndicate) => (
                    <motion.div
                      key={syndicate.id}
                      whileHover={{ scale: 1.03 }}
                      className="bg-gray-800 p-4 rounded-lg border-neon-blue card-inner-shadow"
                    >
                      <h3 className="text-lg font-orbitron text-neon-blue">
                        {syndicate.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {syndicate.description}
                      </p>
                      <p className="text-sm text-gray-400">
                        Goal:{" "}
                        {syndicate.goal.type === "totalMinedBtc" ? "Mine" : ""}{" "}
                        {syndicate.goal.target}{" "}
                        {syndicate.goal.type === "totalMinedBtc" ? "BTC" : ""}
                      </p>
                      <p className="text-sm text-gray-400">
                        Progress: {syndicate.progress}/{syndicate.goal.target}
                      </p>
                      <p className="text-sm text-gray-400">
                        Reward: {syndicate.reward.btc} BTC,{" "}
                        {syndicate.reward.miningPower} TH/s
                      </p>
                      <p className="text-sm text-gray-400">
                        Members: {syndicate.members.length}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleJoinSyndicate(syndicate)}
                        className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                      >
                        Join Syndicate
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">
                  No syndicates available at the moment.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Syndicates;
