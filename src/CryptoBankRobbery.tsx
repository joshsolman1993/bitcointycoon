import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, setDoc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";

interface EventData {
  eventId: string;
  startTime: number;
  endTime: number;
  stage: string;
  progress: number;
  participants: string[];
  bankDefenses: { firewall: number; guards: number; alarms: number };
  successChance: number;
  reward: { btc: number; miningPower: number };
}

interface UserSyndicate {
  syndicateId: string;
  contribution: number;
}

interface UserStatus {
  inPrison: boolean;
  prisonEndTime: number;
}

const CryptoBankRobbery: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [userSyndicate, setUserSyndicate] = useState<UserSyndicate | null>(
    null
  );
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Load event data
  useEffect(() => {
    const eventRef = doc(db, "events", "cryptoBankRobbery"); // Fixed path: events/cryptoBankRobbery
    const unsubscribe = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as EventData;
        setEventData(data);

        // Check if event needs to be reset (weekly)
        const now = Date.now();
        if (now > data.endTime) {
          await resetEvent();
        }
      } else {
        await resetEvent();
      }
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

  // Load user's status (prison)
  useEffect(() => {
    if (!user) return;
    const userStatusRef = doc(db, `users/${user.uid}/status`, "eventStatus");
    const unsubscribe = onSnapshot(userStatusRef, (doc) => {
      if (doc.exists()) {
        setUserStatus(doc.data() as UserStatus);
      } else {
        setUserStatus({ inPrison: false, prisonEndTime: 0 });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Timer for event end
  useEffect(() => {
    if (!eventData) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, eventData.endTime - now);
      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [eventData]);

  const resetEvent = async () => {
    const now = Date.now();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Hétfő
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Vasárnap
    endOfWeek.setHours(23, 59, 59, 999);

    const eventRef = doc(db, "events", "cryptoBankRobbery"); // Fixed path
    await setDoc(eventRef, {
      eventId: `week_${new Date().getFullYear()}_${Math.ceil(
        new Date().getDate() / 7
      )}`,
      startTime: startOfWeek.getTime(),
      endTime: endOfWeek.getTime(),
      stage: "observation",
      progress: 0,
      participants: [],
      bankDefenses: { firewall: 80, guards: 50, alarms: 70 },
      successChance: 0,
      reward: { btc: 500, miningPower: 100 },
    });
  };

  const handleJoinEvent = async () => {
    if (!user || !userSyndicate || !userSyndicate.syndicateId || !eventData)
      return;
    if (userStatus?.inPrison) {
      toast.error("You are in prison and cannot participate!");
      return;
    }
    if (eventData.participants.includes(userSyndicate.syndicateId)) {
      toast.error("Your syndicate is already participating!");
      return;
    }

    const eventRef = doc(db, "events", "cryptoBankRobbery"); // Fixed path
    await updateDoc(eventRef, {
      participants: [...eventData.participants, userSyndicate.syndicateId],
    });
    toast.success("Your syndicate joined the CryptoBank Robbery event!");
  };

  const handleProgressStage = async () => {
    if (!eventData || !userSyndicate || !userSyndicate.syndicateId) return;
    if (!eventData.participants.includes(userSyndicate.syndicateId)) {
      toast.error("Your syndicate is not participating in this event!");
      return;
    }

    const eventRef = doc(db, "events", "cryptoBankRobbery"); // Fixed path
    let newProgress = eventData.progress + 20;
    let newStage = eventData.stage;
    let newSuccessChance = eventData.successChance;

    if (newProgress >= 100) {
      newProgress = 0;
      if (eventData.stage === "observation") {
        newStage = "planning";
        newSuccessChance += 10;
      } else if (eventData.stage === "planning") {
        newStage = "insider";
        newSuccessChance += 20;
      } else if (eventData.stage === "insider") {
        newStage = "execution";
        newSuccessChance += 30;
      } else if (eventData.stage === "execution") {
        newStage = "finished";
        const success = Math.random() * 100 < newSuccessChance;
        if (success) {
          // Jutalom kiosztása
          for (const syndicateId of eventData.participants) {
            const syndicateRef = doc(db, "syndicates", syndicateId);
            const syndicateDoc = await getDoc(syndicateRef);
            if (syndicateDoc.exists()) {
              const syndicateData = syndicateDoc.data();
              for (const memberId of syndicateData.members) {
                const memberRef = doc(db, `users/${memberId}`);
                const memberDoc = await getDoc(memberRef);
                const memberData = memberDoc.exists() ? memberDoc.data() : {};
                await updateDoc(memberRef, {
                  btcBalance:
                    (memberData?.btcBalance || 0) + eventData.reward.btc,
                  miningPower:
                    (memberData?.miningPower || 0) +
                    eventData.reward.miningPower,
                });
              }
            }
          }
          toast.success(
            `Robbery successful! Reward: ${eventData.reward.btc} BTC, ${eventData.reward.miningPower} TH/s`
          );
        } else {
          // Börtönbüntetés
          for (const syndicateId of eventData.participants) {
            const syndicateRef = doc(db, "syndicates", syndicateId);
            const syndicateDoc = await getDoc(syndicateRef);
            if (syndicateDoc.exists()) {
              const syndicateData = syndicateDoc.data();
              for (const memberId of syndicateData.members) {
                const memberStatusRef = doc(
                  db,
                  `users/${memberId}/status`,
                  "eventStatus"
                );
                await setDoc(memberStatusRef, {
                  inPrison: true,
                  prisonEndTime: Date.now() + 24 * 60 * 60 * 1000, // 24 óra börtön
                });
              }
            }
          }
          toast.error(
            "Robbery failed! You got caught and sent to prison for 24 hours."
          );
        }
      }
    }

    await updateDoc(eventRef, {
      progress: newProgress,
      stage: newStage,
      successChance: newSuccessChance,
    });
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
            CryptoBank Robbery Event
          </h2>
          {userStatus?.inPrison ? (
            <div>
              <p className="text-neon-red">
                You are in prison until{" "}
                {new Date(userStatus.prisonEndTime).toLocaleString()}!
              </p>
            </div>
          ) : !eventData ? (
            <p>Loading event...</p>
          ) : (
            <div>
              <p className="text-sm text-gray-400">Event ends in: {timeLeft}</p>
              <p className="text-sm text-gray-400">
                Current Stage:{" "}
                {eventData.stage.charAt(0).toUpperCase() +
                  eventData.stage.slice(1)}
              </p>
              <p className="text-sm text-gray-400">
                Progress: {eventData.progress}%
              </p>
              <p className="text-sm text-gray-400">
                Success Chance: {eventData.successChance}%
              </p>
              <p className="text-sm text-gray-400">
                Reward: {eventData.reward.btc} BTC,{" "}
                {eventData.reward.miningPower} TH/s
              </p>
              <p className="text-sm text-gray-400">
                Bank Defenses: Firewall {eventData.bankDefenses.firewall},
                Guards {eventData.bankDefenses.guards}, Alarms{" "}
                {eventData.bankDefenses.alarms}
              </p>

              {userSyndicate && userSyndicate.syndicateId ? (
                eventData.participants.includes(userSyndicate.syndicateId) ? (
                  eventData.stage !== "finished" ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleProgressStage}
                      className="mt-4 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                    >
                      Contribute to{" "}
                      {eventData.stage.charAt(0).toUpperCase() +
                        eventData.stage.slice(1)}
                    </motion.button>
                  ) : (
                    <p className="text-neon-blue">
                      Event finished! Check your rewards or wait for the next
                      event.
                    </p>
                  )
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={handleJoinEvent}
                    className="mt-4 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                  >
                    Join Event with Syndicate
                  </motion.button>
                )
              ) : (
                <p className="text-gray-400">
                  Join a syndicate to participate in this event!
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CryptoBankRobbery;
