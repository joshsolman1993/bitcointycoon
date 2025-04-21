import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "./firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface SyndicateEvent {
  id: string;
  name: string;
  description: string;
  deadline: number;
  tasks: { description: string; target: number; progress: number }[];
  rewards: { btc: number; shards: number; items: string[] };
  participants: string[];
}

const DarkwebEvents: React.FC = () => {
  const { user, userData } = useAuth();
  const [events, setEvents] = useState<SyndicateEvent[]>([]);
  const [joinedEvent, setJoinedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const eventsRef = collection(db, "darkwebEvents");
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const activeEvents = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as SyndicateEvent))
        .filter((event) => event.deadline > Date.now());
      setEvents(activeEvents);
      setJoinedEvent(
        activeEvents.find((event) => event.participants.includes(user.uid))
          ?.id || null
      );
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (events.length === 0 || events[events.length - 1].deadline < now) {
      const newEvent: SyndicateEvent = {
        id: `event_${Date.now()}`,
        name: "Darkweb Heist",
        description: "Join a syndicate to steal from the Darkweb Vault!",
        deadline: now + 24 * 60 * 60 * 1000,
        tasks: [
          { description: "Contribute BTC", target: 500, progress: 0 },
          {
            description: "Complete CryptoBank Robberies",
            target: 10,
            progress: 0,
          },
        ],
        rewards: { btc: 200, shards: 20, items: ["Darkweb Key"] },
        participants: [],
      };
      addDoc(collection(db, "darkwebEvents"), newEvent);
    }
  }, [events, user]);

  const joinEvent = async (eventId: string) => {
    if (!user) return;
    const eventRef = doc(db, "darkwebEvents", eventId);
    const event = events.find((e) => e.id === eventId);
    if (event && !event.participants.includes(user.uid)) {
      await updateDoc(eventRef, {
        participants: [...event.participants, user.uid],
      });
      toast.success("Joined Darkweb Syndicate Event!");
    }
  };

  const contributeBTC = async (eventId: string, amount: number) => {
    if (!user || !userData || userData.btcBalance < amount) return;
    const eventRef = doc(db, "darkwebEvents", eventId);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      const btcTask = event.tasks.find(
        (task) => task.description === "Contribute BTC"
      );
      if (btcTask) {
        const newProgress = Math.min(btcTask.target, btcTask.progress + amount);
        await updateDoc(eventRef, {
          "tasks.0.progress": newProgress,
        });
        await updateDoc(doc(db, "users", user.uid), {
          btcBalance: userData.btcBalance - amount,
        });
        toast.success(`Contributed ${amount} BTC to the event!`);
      }
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-orbitron text-neon-blue mb-2 neon-text-shadow">
        Darkweb Syndicate Events
      </h3>
      {events.length > 0 ? (
        events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-800 p-4 rounded-lg border-neon-blue mb-2"
          >
            <p className="text-sm text-gray-400">{event.name}</p>
            <p className="text-sm text-gray-400">{event.description}</p>
            <p className="text-sm text-gray-400">
              Ends: {new Date(event.deadline).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">
              Participants: {event.participants.length}
            </p>
            <div className="mt-2">
              {event.tasks.map((task, index) => (
                <p key={index} className="text-sm text-gray-400">
                  {task.description}: {task.progress}/{task.target}
                </p>
              ))}
            </div>
            <p className="text-sm text-gray-400">
              Rewards: {event.rewards.btc} BTC, {event.rewards.shards} Shards,{" "}
              {event.rewards.items.join(", ")}
            </p>
            {!joinedEvent ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => joinEvent(event.id)}
                className="mt-2 px-4 py-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition"
              >
                Join Event
              </motion.button>
            ) : joinedEvent === event.id ? (
              <div className="mt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => contributeBTC(event.id, 50)}
                  className="px-4 py-2 bg-neon-purple text-black rounded hover:bg-neon-purple/80 transition"
                  disabled={(userData?.btcBalance ?? 0) < 50}
                >
                  Contribute 50 BTC
                </motion.button>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <p className="text-gray-400">No active Darkweb Syndicate Events.</p>
      )}
    </div>
  );
};

export default DarkwebEvents;
