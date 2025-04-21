import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import type { Engine } from 'tsparticles-engine';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine);
  };

  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="bg-gradient relative">
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          particles: {
            number: {
              value: 50,
              density: {
                enable: true,
                value_area: 800,
              },
            },
            color: {
              value: '#00f2ff',
            },
            shape: {
              type: 'circle',
            },
            opacity: {
              value: 0.5,
              random: true,
            },
            size: {
              value: 3,
              random: true,
            },
            move: {
              enable: true,
              speed: 1,
              direction: 'none',
              random: true,
              straight: false,
              out_mode: 'out',
            },
          },
          interactivity: {
            events: {
              onhover: {
                enable: true,
                mode: 'repulse',
              },
            },
            modes: {
              repulse: {
                distance: 100,
                duration: 0.4,
              },
            },
          },
          retina_detect: true,
        }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}
      />

      {/* Grid Background */}
      <div className="grid-bg" style={{ zIndex: -1 }}></div>

      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center text-center" style={{ zIndex: 10 }}>
        <div>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <TypeAnimation
              sequence={['Welcome to Bitcoin Tycoon', 1000]}
              wrapper="h1"
              speed={50}
              className="text-5xl font-orbitron text-neon-blue mb-4 neon-text-shadow inline-block"
              repeat={0}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="text-xl text-gray-400 mb-8"
          >
            Build your crypto empire in the darkweb!
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-neon-blue text-black rounded-lg neon-border hover:bg-neon-blue/80 transition pulse-neon"
          >
            Get Started
          </motion.button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4" style={{ zIndex: 10 }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="text-3xl font-orbitron text-neon-blue mb-12 neon-text-shadow text-center"
        >
          Features
        </motion.h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'Build Mining Farms',
              desc: 'Set up and manage your crypto mining farms to generate BTC.',
              icon: '🏢',
              color: 'neon-blue',
            },
            {
              title: 'Trade on Darkweb Market',
              desc: 'Buy and sell goods anonymously to expand your empire.',
              icon: '🛒',
              color: 'neon-purple',
            },
            {
              title: 'Grow Your BTC Empire',
              desc: 'Trade on the crypto exchange and rise to the top.',
              icon: '💸',
              color: 'neon-green',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2, ease: 'easeOut' }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(0, 242, 255, 0.5)' }}
              className={`bg-gradient p-6 rounded-lg neon-border border-${feature.color} card-inner-shadow`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl icon-glow pulse-icon">{feature.icon}</span>
                <div>
                  <h3 className={`text-lg font-orbitron text-${feature.color} neon-text-shadow`}>{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* About the Game Section */}
      <div className="py-16 px-4 bg-gray-900/50" style={{ zIndex: 10 }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="text-3xl font-orbitron text-neon-blue mb-8 neon-text-shadow text-center"
        >
          About the Game
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="text-lg text-gray-400 max-w-3xl mx-auto text-center"
        >
          Step into the darkweb and become a Bitcoin Tycoon! Build your mining farms, trade on the darkweb market, and grow your crypto empire in a thrilling cyberpunk world. Are you ready to dominate the blockchain?
        </motion.p>
      </div>

      {/* Final CTA Section */}
      <div className="py-16 px-4 text-center" style={{ zIndex: 10 }}>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="text-2xl font-orbitron text-neon-blue mb-6 neon-text-shadow"
        >
          Ready to Start Your Journey?
        </motion.h3>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-neon-blue text-black rounded-lg neon-border hover:bg-neon-blue/80 transition pulse-neon"
        >
          Get Started
        </motion.button>
      </div>
    </div>
  );
};

export default Landing;