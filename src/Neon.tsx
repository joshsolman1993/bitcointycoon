import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import DarkwebEvents from "./DarkwebEvents";

interface NeonData {
  neonLevel: number;
  loyaltyPoints: number;
  shards: number;
  activeQuests: {
    id: string;
    description: string;
    deadline: number;
    reward: { btc: number; miningPower: number; item?: string };
  }[];
  unlockedBonuses: string[];
  legacyQuestProgress: number;
  shadowThreatLevel: number;
  shadowAttackCooldown: number;
  cyberArenaCooldown: number;
}

interface NeonMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: number;
  type: string;
}

interface ShadowAttack {
  id: string;
  userId: string;
  attackType: string;
  damage: number;
  timestamp: number;
}

interface CyberArenaResult {
  id: string;
  userId: string;
  wavesCompleted: number;
  rewards: { btc: number; shards: number; items: string[] };
  timestamp: number;
}

interface Drone {
  id: string;
  type: "fast" | "armored" | "suicide"; // Új drón típusok
  hp: number;
  speed: number;
  position: number;
  damage: number; // Sebzés a Data Core-nak
}

interface PowerUp {
  id: string;
  type: "areaBlast" | "timeSlow" | "hpBoost";
  position: number;
}

const Neon: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [neonData, setNeonData] = useState<NeonData | null>(null);
  const [messages, setMessages] = useState<NeonMessage[]>([]);
  const [shadowAttacks, setShadowAttacks] = useState<ShadowAttack[]>([]);
  const [cyberArenaResults, setCyberArenaResults] = useState<
    CyberArenaResult[]
  >([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");

  const [inArena, setInArena] = useState(false);
  const [currentWave, setCurrentWave] = useState(0);
  const [dataCoreHP, setDataCoreHP] = useState(100);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [laserCooldown, setLaserCooldown] = useState(0);
  const [overclockActive, setOverclockActive] = useState(false);
  const [overclockCooldown, setOverclockCooldown] = useState(0);
  const [hackShieldCooldown, setHackShieldCooldown] = useState(0);
  const [preparationPhase, setPreparationPhase] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<
    "damageBoost" | "speedBoost" | "hpRegen" | null
  >(null);

  useEffect(() => {
    if (!user) return;
    const neonRef = doc(db, `users/${user.uid}/neon`, "data");
    const unsubscribe = onSnapshot(neonRef, (doc) => {
      if (doc.exists()) {
        setNeonData(doc.data() as NeonData);
      } else {
        const initialData: NeonData = {
          neonLevel: 1,
          loyaltyPoints: 0,
          shards: 0,
          activeQuests: [],
          unlockedBonuses: [],
          legacyQuestProgress: 0,
          shadowThreatLevel: 0,
          shadowAttackCooldown: 0,
          cyberArenaCooldown: 0,
        };
        setDoc(neonRef, initialData).then(() => setNeonData(initialData));
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const messagesRef = collection(db, "neonMessages");
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const userMessages: NeonMessage[] = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as NeonMessage))
        .filter((msg) => msg.userId === user.uid)
        .sort((a, b) => b.timestamp - a.timestamp);
      setMessages(userMessages);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const attacksRef = collection(db, "shadowAttacks");
    const unsubscribe = onSnapshot(attacksRef, (snapshot) => {
      const userAttacks: ShadowAttack[] = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as ShadowAttack))
        .filter((attack) => attack.userId === user.uid)
        .sort((a, b) => b.timestamp - a.timestamp);
      setShadowAttacks(userAttacks);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const resultsRef = collection(db, "cyberArenaResults");
    const unsubscribe = onSnapshot(resultsRef, (snapshot) => {
      const userResults: CyberArenaResult[] = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as CyberArenaResult))
        .filter((result) => result.userId === user.uid)
        .sort((a, b) => b.timestamp - a.timestamp);
      setCyberArenaResults(userResults);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!neonData || !user) return;
    const now = Date.now();
    const hasActiveQuest = neonData.activeQuests.some(
      (quest) => quest.deadline > now
    );
    if (!hasActiveQuest) {
      const newQuest = {
        id: `quest_${Date.now()}`,
        description:
          "Infiltrate the Darkweb Market and buy a Decryptor within 48 hours.",
        deadline: now + 48 * 60 * 60 * 1000,
        reward: { btc: 50, miningPower: 10, item: "Quantum Firewall" },
      };
      const neonRef = doc(db, `users/${user.uid}/neon`, "data");
      updateDoc(neonRef, {
        activeQuests: [...neonData.activeQuests, newQuest],
      });
      addNeonMessage(
        "New quest available: Infiltrate the Darkweb Market!",
        "quest"
      );
    }
  }, [neonData, user]);

  useEffect(() => {
    if (!neonData || !user || neonData.legacyQuestProgress >= 3) return;
    if (neonData.legacyQuestProgress === 0) {
      addNeonMessage(
        "I’ve detected a hidden data fragment about my creators. Will you help me find it, human?",
        "quest"
      );
    }
  }, [neonData, user]);

  useEffect(() => {
    if (!neonData || !user) return;
    const now = Date.now();
    if (neonData.shadowAttackCooldown < now) {
      const newThreatLevel = Math.min(100, neonData.shadowThreatLevel + 10);
      const newCooldown = now + 24 * 60 * 60 * 1000;
      updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
        shadowThreatLevel: newThreatLevel,
        shadowAttackCooldown: newCooldown,
      });

      if (newThreatLevel >= 50 && Math.random() < 0.5) {
        const attackType =
          Math.random() < 0.5 ? "miningPowerReduction" : "btcTheft";
        let damage = 0;
        if (attackType === "miningPowerReduction") {
          damage = Math.floor((userData?.miningPower || 0) * 0.1);
          updateDoc(doc(db, "users", user.uid), {
            miningPower: Math.max(0, (userData?.miningPower || 0) - damage),
          });
          addNeonMessage(
            `SHADOW attacked! Your Mining Power decreased by ${damage} TH/s. We need to fight back!`,
            "reaction"
          );
        } else {
          damage = Math.floor((userData?.btcBalance || 0) * 0.05);
          updateDoc(doc(db, "users", user.uid), {
            btcBalance: Math.max(0, (userData?.btcBalance || 0) - damage),
          });
          addNeonMessage(
            `SHADOW stole ${damage} BTC from you! This is getting serious, human.`,
            "reaction"
          );
        }
        addDoc(collection(db, "shadowAttacks"), {
          userId: user.uid,
          attackType,
          damage,
          timestamp: now,
        });
      }
    }
  }, [neonData, user, userData]);

  const startCyberArena = async () => {
    if (!neonData || !user) return;
    const now = Date.now();
    if (neonData.cyberArenaCooldown > now) {
      toast.error(
        `Cyber Arena is on cooldown until ${new Date(
          neonData.cyberArenaCooldown
        ).toLocaleString()}!`
      );
      return;
    }
    if (neonData.shards < 10) {
      toast.error("You need 10 NEON Shards to enter the Cyber Arena!");
      return;
    }

    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      shards: neonData.shards - 10,
      cyberArenaCooldown: now + 24 * 60 * 60 * 1000,
    });
    setInArena(true);
    setCurrentWave(0);
    setDataCoreHP(100);
    setDrones([]);
    setPowerUps([]);
    setLaserCooldown(0);
    setOverclockActive(false);
    setOverclockCooldown(0);
    setHackShieldCooldown(0);
    setPreparationPhase(true);
    setSelectedBonus(null);
    addNeonMessage(
      "Welcome to the Cyber Arena, human! Choose a bonus before the battle begins!",
      "reaction"
    );
  };

  const spawnWave = (wave: number) => {
    setCurrentWave(wave);
    const droneCounts = [5, 8, 10];
    const newDrones: Drone[] = [];
    for (let i = 0; i < droneCounts[wave - 1]; i++) {
      const typeRoll = Math.random();
      let type: Drone["type"] = "fast";
      let hp = 10;
      let speed = 2;
      let damage = 10;
      if (typeRoll < 0.33) {
        type = "fast"; // Gyors drón
        hp = 8;
        speed = 3;
        damage = 5;
      } else if (typeRoll < 0.66) {
        type = "armored"; // Páncélozott drón
        hp = 20;
        speed = 1;
        damage = 15;
      } else {
        type = "suicide"; // Öngyilkos drón (nagyobb sebzés, de gyorsabb pusztulás)
        hp = 5;
        speed = 2.5;
        damage = 20;
      }
      newDrones.push({
        id: `drone_${wave}_${i}`,
        type,
        hp,
        speed,
        position: 0,
        damage,
      });
    }
    setDrones(newDrones);

    // Power-Up spawn esély
    if (Math.random() < 0.5) {
      const powerUpTypeRoll = Math.random();
      let powerUpType: PowerUp["type"] = "areaBlast";
      if (powerUpTypeRoll < 0.33) powerUpType = "areaBlast";
      else if (powerUpTypeRoll < 0.66) powerUpType = "timeSlow";
      else powerUpType = "hpBoost";
      setPowerUps([
        ...powerUps,
        {
          id: `powerup_${wave}_${Date.now()}`,
          type: powerUpType,
          position: Math.random() * 80,
        },
      ]);
    }

    addNeonMessage(`Wave ${wave} incoming! New enemies detected!`, "reaction");
  };

  const handleLaserAttack = () => {
    if (laserCooldown > 0 || drones.length === 0) return;
    const attackSpeed = overclockActive ? 1 : 2;
    const damageBoost = selectedBonus === "damageBoost" ? 1.5 : 1;
    setLaserCooldown(attackSpeed);
    const targetDrone = drones[0];
    const newHP = targetDrone.hp - 5 * damageBoost;
    if (newHP <= 0) {
      setDrones(drones.slice(1));
    } else {
      setDrones([{ ...targetDrone, hp: newHP }, ...drones.slice(1)]);
    }
  };

  const handleOverclock = () => {
    if (
      !neonData?.unlockedBonuses.includes("neonOverclock") ||
      overclockCooldown > 0
    )
      return;
    setOverclockActive(true);
    setOverclockCooldown(30);
    setTimeout(() => setOverclockActive(false), 10000);
    addNeonMessage("Overclock activated! Attack speed increased!", "reaction");
  };

  const handleHackShield = () => {
    if (
      !neonData?.unlockedBonuses.includes("neonHackShield") ||
      hackShieldCooldown > 0
    )
      return;
    setHackShieldCooldown(30);
    setDataCoreHP(Math.min(100, dataCoreHP + 20));
    addNeonMessage(
      "Hack Shield activated! Data Core HP restored by 20!",
      "reaction"
    );
  };

  const handlePowerUp = (powerUp: PowerUp) => {
    switch (powerUp.type) {
      case "areaBlast":
        setDrones([]); // Minden drón elpusztítása
        addNeonMessage(
          "AreaELASTEPHENS-INSIDE: Area Blast activated! All drones destroyed!",
          "reaction"
        );
        break;
      case "timeSlow":
        setDrones(
          drones.map((drone) => ({ ...drone, speed: drone.speed * 0.5 }))
        );
        setTimeout(() => {
          setDrones(
            drones.map((drone) => ({ ...drone, speed: drone.speed * 2 }))
          );
        }, 5000);
        addNeonMessage(
          "Time Slow activated! Drones slowed for 5 seconds!",
          "reaction"
        );
        break;
      case "hpBoost":
        setDataCoreHP(Math.min(100, dataCoreHP + 30));
        addNeonMessage(
          "HP Boost activated! Data Core HP restored by 30!",
          "reaction"
        );
        break;
    }
    setPowerUps(powerUps.filter((p) => p.id !== powerUp.id));
  };

  const startWave = () => {
    setPreparationPhase(false);
    spawnWave(currentWave + 1);
  };

  useEffect(() => {
    if (!inArena || preparationPhase) return;
    const interval = setInterval(() => {
      if (laserCooldown > 0) {
        setLaserCooldown((prev) => Math.max(0, prev - 0.1));
      }
      if (overclockCooldown > 0) {
        setOverclockCooldown((prev) => Math.max(0, prev - 0.1));
      }
      if (hackShieldCooldown > 0) {
        setHackShieldCooldown((prev) => Math.max(0, prev - 0.1));
      }

      const speedBoost = selectedBonus === "speedBoost" ? 0.8 : 1;
      const newDrones = drones.map((drone) => ({
        ...drone,
        position: Math.min(100, drone.position + drone.speed * speedBoost),
      }));

      const dronesReached = newDrones.filter((drone) => drone.position >= 100);
      if (dronesReached.length > 0) {
        const totalDamage = dronesReached.reduce(
          (sum, drone) => sum + drone.damage,
          0
        );
        setDataCoreHP((prev) => Math.max(0, prev - totalDamage));
        setDrones(newDrones.filter((drone) => drone.position < 100));
      } else {
        setDrones(newDrones);
      }

      if (newDrones.length === 0 && dataCoreHP > 0 && user) {
        const waveReward = { btc: 10, shards: 5, items: [] as string[] };
        updateDoc(doc(db, "users", user.uid), {
          btcBalance: (userData?.btcBalance || 0) + waveReward.btc,
        });
        updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
          shards: (neonData?.shards || 0) + waveReward.shards,
        });
        addNeonMessage(
          `Wave ${currentWave} cleared! Reward: ${waveReward.btc} BTC, ${waveReward.shards} Shards.`,
          "reaction"
        );
        toast.success(`Wave ${currentWave} cleared!`);

        if (currentWave < 3) {
          setPreparationPhase(true);
          setSelectedBonus(null);
          addNeonMessage(
            "Prepare for the next wave! Choose a bonus!",
            "reaction"
          );
        } else {
          const finalReward = { btc: 50, shards: 10, items: ["SHADOW Core"] };
          updateDoc(doc(db, "users", user.uid), {
            btcBalance: (userData?.btcBalance || 0) + finalReward.btc,
          });
          updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
            shards: (neonData?.shards || 0) + finalReward.shards,
          });
          addNeonMessage(
            `Cyber Arena completed! Final Reward: ${finalReward.btc} BTC, ${finalReward.shards} Shards, SHADOW Core (+5% CryptoBank Robbery success chance).`,
            "reaction"
          );
          toast.success("Cyber Arena completed! SHADOW Core acquired!");
          addDoc(collection(db, "cyberArenaResults"), {
            userId: user.uid,
            wavesCompleted: 3,
            rewards: finalReward,
            timestamp: Date.now(),
          });
          setInArena(false);
        }
      }

      if (dataCoreHP <= 0 && user) {
        addNeonMessage(
          "The Data Core was destroyed! Better luck next time, human.",
          "reaction"
        );
        addDoc(collection(db, "cyberArenaResults"), {
          userId: user.uid,
          wavesCompleted: currentWave - 1,
          rewards: {
            btc: 10 * (currentWave - 1),
            shards: 5 * (currentWave - 1),
            items: [],
          },
          timestamp: Date.now(),
        });
        setInArena(false);
      }

      if (selectedBonus === "hpRegen") {
        setDataCoreHP((prev) => Math.min(100, prev + 0.5));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    inArena,
    preparationPhase,
    drones,
    laserCooldown,
    overclockCooldown,
    hackShieldCooldown,
    dataCoreHP,
    currentWave,
    user,
    userData,
    neonData,
    selectedBonus,
  ]);

  const addNeonMessage = async (message: string, type: string) => {
    if (!user) return;
    await addDoc(collection(db, "neonMessages"), {
      userId: user.uid,
      message,
      timestamp: Date.now(),
      type,
    });
  };

  const handleAskQuestion = async () => {
    if (!selectedQuestion || !user || !userData) return;
    let response = "";
    switch (selectedQuestion) {
      case "strategy":
        response =
          "For the CryptoBank Robbery event, focus on upgrading your NEON level to increase success chance. Join a strong syndicate like the Crypto Kings.";
        break;
      case "miningPower":
        response =
          "To boost your Mining Power, upgrade your farms to Tier 3 or buy a Quantum Miner from the Darkweb Market. Your current Mining Power is " +
          (userData?.miningPower || 0) +
          " TH/s.";
        break;
      default:
        response = "Hmm, I’m not sure about that. Try asking something else!";
    }
    await addNeonMessage(response, "tip");
    setSelectedQuestion("");
  };

  const handleCompleteQuest = async (questId: string) => {
    if (!neonData || !user) return;
    const quest = neonData.activeQuests.find((q) => q.id === questId);
    if (!quest) return;

    const now = Date.now();
    if (now > quest.deadline) {
      await addNeonMessage(
        "Too slow, human... That quest expired. Better luck next time!",
        "reaction"
      );
      const updatedQuests = neonData.activeQuests.filter(
        (q) => q.id !== questId
      );
      await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
        activeQuests: updatedQuests,
      });
      return;
    }

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      btcBalance: (userData?.btcBalance || 0) + quest.reward.btc,
      miningPower: (userData?.miningPower || 0) + quest.reward.miningPower,
    });
    const updatedQuests = neonData.activeQuests.filter((q) => q.id !== questId);
    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      activeQuests: updatedQuests,
      loyaltyPoints: (neonData.loyaltyPoints || 0) + 20,
      shards: (neonData.shards || 0) + 5,
    });
    await addNeonMessage(
      `Quest completed! Reward: ${quest.reward.btc} BTC, ${quest.reward.miningPower} TH/s. Nice work, human!`,
      "reaction"
    );
    toast.success("Quest completed!");
  };

  const handleUpgradeNeon = async () => {
    if (!neonData || !user) return;
    if (neonData.neonLevel >= 4) {
      toast.error("NEON is already at max level!");
      return;
    }
    const shardsRequired = neonData.neonLevel * 20;
    if (neonData.shards < shardsRequired) {
      toast.error(
        `You need ${shardsRequired} Shards to upgrade NEON to Level ${
          neonData.neonLevel + 1
        }!`
      );
      return;
    }
    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      neonLevel: neonData.neonLevel + 1,
      shards: neonData.shards - shardsRequired,
    });
    await addNeonMessage(
      `NEON upgraded to Level ${
        neonData.neonLevel + 1
      }! I’m now even smarter. What’s next?`,
      "reaction"
    );
    toast.success(`NEON upgraded to Level ${neonData.neonLevel + 1}!`);
  };

  const handleUnlockBonus = async (bonus: string) => {
    if (!neonData || !user) return;
    if (neonData.unlockedBonuses.includes(bonus)) {
      toast.error("This bonus is already unlocked!");
      return;
    }
    const bonusCosts: { [key: string]: number } = {
      neonOverclock: 50,
      neonHackShield: 100,
      neonDataVault: 200,
    };
    const cost = bonusCosts[bonus];
    if (neonData.loyaltyPoints < cost) {
      toast.error(`You need ${cost} Loyalty Points to unlock this bonus!`);
      return;
    }
    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      loyaltyPoints: neonData.loyaltyPoints - cost,
      unlockedBonuses: [...neonData.unlockedBonuses, bonus],
    });
    await addNeonMessage(
      `Bonus unlocked: ${bonus}! You’re making me proud, human.`,
      "reaction"
    );
    toast.success(`Bonus unlocked: ${bonus}!`);
  };

  const handleLegacyQuest = async () => {
    if (!neonData || !user) return;
    const progress = neonData.legacyQuestProgress;
    if (progress >= 3) {
      toast.error("NEON's Legacy questline is already completed!");
      return;
    }

    const legacyQuests = [
      "Hack into the Crypto Exchange and retrieve a data fragment (Cost: 50 BTC).",
      "Join a CryptoBank Robbery event and steal a secure key (Cost: 100 Loyalty Points).",
      "Decrypt the final fragment using 30 NEON Shards.",
    ];
    const currentQuest = legacyQuests[progress];

    if (progress === 0 && (userData?.btcBalance || 0) < 50) {
      toast.error("You need 50 BTC to proceed with this quest!");
      return;
    }
    if (progress === 1 && (neonData.loyaltyPoints || 0) < 100) {
      toast.error("You need 100 Loyalty Points to proceed with this quest!");
      return;
    }
    if (progress === 2 && (neonData.shards || 0) < 30) {
      toast.error("You need 30 NEON Shards to proceed with this quest!");
      return;
    }

    if (progress === 0) {
      await updateDoc(doc(db, "users", user.uid), {
        btcBalance: (userData?.btcBalance || 0) - 50,
      });
    } else if (progress === 1) {
      await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
        loyaltyPoints: neonData.loyaltyPoints - 100,
      });
    } else if (progress === 2) {
      await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
        shards: neonData.shards - 30,
      });
      await updateDoc(doc(db, "users", user.uid), {
        miningPower: (userData?.miningPower || 0) + 15,
      });
      await addNeonMessage(
        "We did it, human! The data fragment reveals my creators’ location. As a reward, I’ve unlocked the NEON Core: +15% Mining Power!",
        "reaction"
      );
      toast.success(
        "NEON's Legacy completed! Reward: NEON Core (+15% Mining Power)"
      );
    }

    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      legacyQuestProgress: progress + 1,
    });
    await addNeonMessage(
      progress < 2
        ? `Step ${progress + 1} completed! Next: ${legacyQuests[progress + 1]}`
        : "Final step completed!",
      "quest"
    );
    toast.success(`NEON's Legacy: Step ${progress + 1} completed!`);
  };

  const handleCounterShadow = async () => {
    if (!neonData || !user) return;
    if (neonData.shadowThreatLevel === 0) {
      toast.error("No SHADOW threat to counter!");
      return;
    }
    const cost = Math.floor(neonData.shadowThreatLevel / 2);
    if (neonData.shards < cost) {
      toast.error(`You need ${cost} NEON Shards to counter SHADOW!`);
      return;
    }
    await updateDoc(doc(db, `users/${user.uid}/neon`, "data"), {
      shadowThreatLevel: 0,
      shards: neonData.shards - cost,
    });
    await addNeonMessage(
      `SHADOW threat neutralized! That pest won’t bother us for a while.`,
      "reaction"
    );
    toast.success("SHADOW threat neutralized!");
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
            NEON - Your Hacker AI Assistant
          </h2>
          {!neonData ? (
            <p>Loading NEON...</p>
          ) : (
            <div>
              {inArena ? (
                <div className="relative h-96 bg-gray-900 rounded-lg border-neon-blue p-4">
                  {preparationPhase ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <h3 className="text-lg font-orbitron text-neon-blue mb-4 neon-text-shadow">
                        Prepare for Wave {currentWave + 1}
                      </h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Choose a bonus for the next wave:
                      </p>
                      <div className="flex space-x-4">
                        <motion.button
                          onClick={() => setSelectedBonus("damageBoost")}
                          className={`px-4 py-2 rounded ${
                            selectedBonus === "damageBoost"
                              ? "bg-neon-purple text-black"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          } transition neon-border`}
                          whileHover={{ scale: 1.05 }}
                        >
                          Damage Boost (+50% Laser Damage)
                        </motion.button>
                        <motion.button
                          onClick={() => setSelectedBonus("speedBoost")}
                          className={`px-4 py-2 rounded ${
                            selectedBonus === "speedBoost"
                              ? "bg-neon-purple text-black"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          } transition neon-border`}
                          whileHover={{ scale: 1.05 }}
                        >
                          Speed Boost (Drones Move Slower)
                        </motion.button>
                        <motion.button
                          onClick={() => setSelectedBonus("hpRegen")}
                          className={`px-4 py-2 rounded ${
                            selectedBonus === "hpRegen"
                              ? "bg-neon-purple text-black"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          } transition neon-border`}
                          whileHover={{ scale: 1.05 }}
                        >
                          HP Regen (Core Regenerates HP)
                        </motion.button>
                      </div>
                      <motion.button
                        onClick={startWave}
                        className="mt-6 px-6 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                        whileHover={{ scale: 1.05 }}
                        disabled={!selectedBonus}
                      >
                        Start Wave
                      </motion.button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                        NEON Cyber Arena - Wave {currentWave}
                      </h3>
                      <div
                        className="relative h-48 rounded-lg overflow-hidden"
                        style={{
                          background:
                            "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                          boxShadow: "inset 0 0 20px rgba(0, 242, 255, 0.3)",
                        }}
                      >
                        {/* Háttér animáció - villódzó neonfények */}
                        <motion.div
                          className="absolute inset-0"
                          animate={{
                            opacity: [0.2, 0.5, 0.2],
                            background: [
                              "rgba(0, 242, 255, 0.1)",
                              "rgba(0, 242, 255, 0.3)",
                              "rgba(0, 242, 255, 0.1)",
                            ],
                          }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        {/* Data Core */}
                        <motion.div
                          className="absolute right-0 w-12 h-12 bg-neon-blue rounded-full flex items-center justify-center"
                          style={{
                            boxShadow: "0 0 20px rgba(0, 242, 255, 0.8)",
                          }}
                          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 3 }}
                        >
                          <span className="text-black font-bold">
                            {dataCoreHP}
                          </span>
                        </motion.div>
                        {/* Drones */}
                        <AnimatePresence>
                          {drones.map((drone) => (
                            <motion.div
                              key={drone.id}
                              className="absolute w-8 h-8 rounded-full"
                              style={{
                                left: `${drone.position}%`,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background:
                                  drone.type === "fast"
                                    ? "linear-gradient(45deg, #ff4d4d, #ff1a1a)"
                                    : drone.type === "armored"
                                    ? "linear-gradient(45deg, #6666ff, #3333cc)"
                                    : "linear-gradient(45deg, #ffcc00, #ff9900)",
                                boxShadow:
                                  drone.type === "fast"
                                    ? "0 0 10px rgba(255, 77, 77, 0.8)"
                                    : drone.type === "armored"
                                    ? "0 0 10px rgba(102, 102, 255, 0.8)"
                                    : "0 0 10px rgba(255, 204, 0, 0.8)",
                              }}
                              initial={{ left: "0%" }}
                              animate={{ left: `${drone.position}%` }}
                              exit={{
                                opacity: 0,
                                scale: 0,
                                transition: { duration: 0.3 },
                              }}
                            >
                              <span className="text-white text-xs absolute top-0 left-0 w-full text-center">
                                {drone.hp}
                              </span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {/* Power-Ups */}
                        <AnimatePresence>
                          {powerUps.map((powerUp) => (
                            <motion.div
                              key={powerUp.id}
                              className="absolute w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                              style={{
                                left: `${powerUp.position}%`,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background:
                                  powerUp.type === "areaBlast"
                                    ? "linear-gradient(45deg, #ff0066, #cc0052)"
                                    : powerUp.type === "timeSlow"
                                    ? "linear-gradient(45deg, #00ccff, #0099cc)"
                                    : "linear-gradient(45deg, #00ff99, #00cc77)",
                                boxShadow:
                                  powerUp.type === "areaBlast"
                                    ? "0 0 15px rgba(255, 0, 102, 0.8)"
                                    : powerUp.type === "timeSlow"
                                    ? "0 0 15px rgba(0, 204, 255, 0.8)"
                                    : "0 0 15px rgba(0, 255, 153, 0.8)",
                              }}
                              animate={{ y: [-5, 5, -5] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              onClick={() => handlePowerUp(powerUp)}
                            >
                              <span className="text-black text-xs font-bold">
                                {powerUp.type === "areaBlast"
                                  ? "💥"
                                  : powerUp.type === "timeSlow"
                                  ? "⏳"
                                  : "❤️"}
                              </span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="mt-4 flex space-x-4">
                        <motion.button
                          onClick={handleLaserAttack}
                          className={`px-4 py-2 rounded font-orbitron ${
                            laserCooldown > 0
                              ? "bg-gray-600 text-gray-400"
                              : "bg-neon-blue text-black hover:bg-neon-blue/80"
                          } transition neon-border`}
                          disabled={laserCooldown > 0}
                          whileHover={{ scale: laserCooldown > 0 ? 1 : 1.05 }}
                        >
                          Laser Attack{" "}
                          {laserCooldown > 0
                            ? `(${laserCooldown.toFixed(1)}s)`
                            : ""}
                        </motion.button>
                        {neonData.unlockedBonuses.includes("neonOverclock") && (
                          <motion.button
                            onClick={handleOverclock}
                            className={`px-4 py-2 rounded font-orbitron ${
                              overclockCooldown > 0
                                ? "bg-gray-600 text-gray-400"
                                : "bg-neon-purple text-black hover:bg-neon-purple/80"
                            } transition neon-border`}
                            disabled={overclockCooldown > 0}
                            whileHover={{
                              scale: overclockCooldown > 0 ? 1 : 1.05,
                            }}
                          >
                            Overclock{" "}
                            {overclockCooldown > 0
                              ? `(${overclockCooldown.toFixed(1)}s)`
                              : ""}
                          </motion.button>
                        )}
                        {neonData.unlockedBonuses.includes(
                          "neonHackShield"
                        ) && (
                          <motion.button
                            onClick={handleHackShield}
                            className={`px-4 py-2 rounded font-orbitron ${
                              hackShieldCooldown > 0
                                ? "bg-gray-600 text-gray-400"
                                : "bg-neon-green text-black hover:bg-neon-green/80"
                            } transition neon-border`}
                            disabled={hackShieldCooldown > 0}
                            whileHover={{
                              scale: hackShieldCooldown > 0 ? 1 : 1.05,
                            }}
                          >
                            Hack Shield{" "}
                            {hackShieldCooldown > 0
                              ? `(${hackShieldCooldown.toFixed(1)}s)`
                              : ""}
                          </motion.button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-400">
                      NEON Level: {neonData.neonLevel}
                    </p>
                    <p className="text-sm text-gray-400">
                      Loyalty Points: {neonData.loyaltyPoints}
                    </p>
                    <p className="text-sm text-gray-400">
                      NEON Shards: {neonData.shards}
                    </p>
                    {neonData.neonLevel < 4 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={handleUpgradeNeon}
                        className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                      >
                        Upgrade NEON (Cost: {neonData.neonLevel * 20} Shards)
                      </motion.button>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      NEON Cyber Arena
                    </h3>
                    <div className="bg-gray-800 p-4 rounded-lg border-neon-blue">
                      <p className="text-sm text-gray-400">
                        Fight SHADOW drones in the Cyber Arena to earn exclusive
                        rewards!
                      </p>
                      <p className="text-sm text-gray-400">
                        Next Battle:{" "}
                        {neonData.cyberArenaCooldown > Date.now()
                          ? new Date(
                              neonData.cyberArenaCooldown
                            ).toLocaleString()
                          : "Available Now!"}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={startCyberArena}
                        className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                        disabled={neonData.cyberArenaCooldown > Date.now()}
                      >
                        Enter Cyber Arena (Cost: 10 Shards)
                      </motion.button>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-orbitron text-neon-blue">
                        Recent Battles
                      </h4>
                      {cyberArenaResults.length > 0 ? (
                        cyberArenaResults.slice(0, 3).map((result) => (
                          <p key={result.id} className="text-sm text-gray-400">
                            [{new Date(result.timestamp).toLocaleString()}]
                            Waves Completed: {result.wavesCompleted}, Rewards:{" "}
                            {result.rewards.btc} BTC, {result.rewards.shards}{" "}
                            Shards, {result.rewards.items.join(", ")}
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-400">No recent battles.</p>
                      )}
                    </div>
                  </div>
                  <DarkwebEvents /> {/* Új komponens hozzáadása */}
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      Active Quests
                    </h3>
                    {neonData.activeQuests.length > 0 ? (
                      neonData.activeQuests.map((quest) => (
                        <div
                          key={quest.id}
                          className="bg-gray-800 p-4 rounded-lg border-neon-blue mb-2"
                        >
                          <p className="text-sm text-gray-400">
                            {quest.description}
                          </p>
                          <p className="text-sm text-gray-400">
                            Deadline:{" "}
                            {new Date(quest.deadline).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-400">
                            Reward: {quest.reward.btc} BTC,{" "}
                            {quest.reward.miningPower} TH/s
                            {quest.reward.item && `, ${quest.reward.item}`}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleCompleteQuest(quest.id)}
                            className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                          >
                            Complete Quest
                          </motion.button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">
                        No active quests. Check back later!
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      NEON's Legacy Questline
                    </h3>
                    {neonData.legacyQuestProgress < 3 ? (
                      <div className="bg-gray-800 p-4 rounded-lg border-neon-blue">
                        <p className="text-sm text-gray-400">
                          Step {neonData.legacyQuestProgress + 1}:{" "}
                          {
                            [
                              "Hack into the Crypto Exchange and retrieve a data fragment (Cost: 50 BTC).",
                              "Join a CryptoBank Robbery event and steal a secure key (Cost: 100 Loyalty Points).",
                              "Decrypt the final fragment using 30 NEON Shards.",
                            ][neonData.legacyQuestProgress]
                          }
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={handleLegacyQuest}
                          className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                        >
                          Proceed with Quest
                        </motion.button>
                      </div>
                    ) : (
                      <p className="text-neon-blue">
                        NEON's Legacy completed! NEON Core unlocked (+15% Mining
                        Power).
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      SHADOW Threat
                    </h3>
                    <div className="bg-gray-800 p-4 rounded-lg border-neon-blue">
                      <p className="text-sm text-gray-400">
                        SHADOW Threat Level: {neonData.shadowThreatLevel}%
                      </p>
                      <p className="text-sm text-gray-400">
                        Next Attack:{" "}
                        {neonData.shadowAttackCooldown > Date.now()
                          ? new Date(
                              neonData.shadowAttackCooldown
                            ).toLocaleString()
                          : "Imminent!"}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={handleCounterShadow}
                        className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                        disabled={neonData.shadowThreatLevel === 0}
                      >
                        Counter SHADOW (Cost:{" "}
                        {Math.floor(neonData.shadowThreatLevel / 2)} Shards)
                      </motion.button>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-orbitron text-neon-blue">
                        Recent SHADOW Attacks
                      </h4>
                      {shadowAttacks.length > 0 ? (
                        shadowAttacks.slice(0, 3).map((attack) => (
                          <p key={attack.id} className="text-sm text-gray-400">
                            [{new Date(attack.timestamp).toLocaleString()}]
                            SHADOW{" "}
                            {attack.attackType === "miningPowerReduction"
                              ? "reduced Mining Power"
                              : "stole BTC"}{" "}
                            by {attack.damage}.
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-400">
                          No recent SHADOW attacks.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      Unlock Bonuses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "neonOverclock",
                          name: "NEON Overclock",
                          cost: 50,
                          description:
                            "Boost farm Mining Power by 10% for 24 hours.",
                        },
                        {
                          id: "neonHackShield",
                          name: "NEON Hack Shield",
                          cost: 100,
                          description:
                            "Reduce CryptoBank Robbery failure chance by 20%.",
                        },
                        {
                          id: "neonDataVault",
                          name: "NEON Data Vault",
                          cost: 200,
                          description: "Store up to 1000 BTC safely.",
                        },
                      ].map((bonus) => (
                        <div
                          key={bonus.id}
                          className="bg-gray-800 p-4 rounded-lg border-neon-blue"
                        >
                          <p className="text-sm text-gray-400">{bonus.name}</p>
                          <p className="text-sm text-gray-400">
                            {bonus.description}
                          </p>
                          <p className="text-sm text-gray-400">
                            Cost: {bonus.cost} Loyalty Points
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleUnlockBonus(bonus.id)}
                            className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                            disabled={neonData.unlockedBonuses.includes(
                              bonus.id
                            )}
                          >
                            {neonData.unlockedBonuses.includes(bonus.id)
                              ? "Unlocked"
                              : "Unlock Bonus"}
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      Ask NEON
                    </h3>
                    <select
                      value={selectedQuestion}
                      onChange={(e) => setSelectedQuestion(e.target.value)}
                      className="p-2 bg-gray-800 text-white rounded border-neon-blue"
                    >
                      <option value="">Select a question...</option>
                      <option value="strategy">
                        Best strategy for CryptoBank Robbery?
                      </option>
                      <option value="miningPower">
                        How to increase Mining Power?
                      </option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleAskQuestion}
                      className="ml-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
                      disabled={!selectedQuestion}
                    >
                      Ask
                    </motion.button>
                  </div>
                  <div>
                    <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
                      NEON Messages
                    </h3>
                    <div className="bg-gray-900 p-4 rounded-lg border-neon-blue h-64 overflow-y-auto">
                      {messages.map((msg) => (
                        <div key={msg.id} className="mb-2">
                          <span className="text-sm text-neon-blue font-semibold">
                            [{new Date(msg.timestamp).toLocaleTimeString()}]
                            NEON:
                          </span>
                          <span className="text-sm text-gray-300">
                            {" "}
                            {msg.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Neon;
