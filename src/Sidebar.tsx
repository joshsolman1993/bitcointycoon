import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Sidebar: React.FC = () => {
  return (
    <motion.div
      initial={{ x: -200 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-[80px] left-0 h-[calc(100%-80px)] w-64 bg-gradient p-4 flex flex-col space-y-4 shadow-lg sidebar-glow"
      style={{ zIndex: 20 }}
    >
      <div className="mb-8">
        <h2 className="text-xl font-orbitron text-neon-blue neon-text-shadow">
          Menu
        </h2>
      </div>
      {[
        { to: "/dashboard", label: "Dashboard", icon: "🏠" },
        { to: "/buildings", label: "Buildings", icon: "🏢" },
        { to: "/darkweb-market", label: "Darkweb Market", icon: "🛒" },
        { to: "/quests", label: "Quests", icon: "📜" },
        { to: "/crypto-exchange", label: "Crypto Exchange", icon: "💸" },
        { to: "/profile", label: "Profile", icon: "👤" },
        { to: "/leaderboard", label: "Leaderboard", icon: "🏆" },
        { to: "/syndicates", label: "Syndicates", icon: "👥" },
        { to: "/crypto-bank-robbery", label: "CryptoBank Robbery", icon: "🏦" },
        { to: "/neon", label: "NEON", icon: "🤖" },
      ].map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center space-x-3 p-2 rounded-lg transition ${
              isActive
                ? "bg-neon-blue text-black"
                : "text-gray-400 hover:bg-gray-800"
            }`
          }
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="font-orbitron">{item.label}</span>
        </NavLink>
      ))}
    </motion.div>
  );
};

export default Sidebar;
