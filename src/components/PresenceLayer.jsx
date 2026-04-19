import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';
import { MousePointer2 } from 'lucide-react';

const PresenceLayer = () => {
  const { awareness, updateCursor } = useOSStore();
  const [remoteUsers, setRemoteUsers] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      updateCursor({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    const updateUsers = () => {
      const states = awareness.getStates();
      const users = [];
      states.forEach((state, clientID) => {
        if (clientID !== awareness.clientID && state.user && state.user.cursor) {
          users.push({ clientID, ...state.user });
        }
      });
      setRemoteUsers(users);
    };

    awareness.on('change', updateUsers);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      awareness.off('change', updateUsers);
    };
  }, [awareness, updateCursor]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {remoteUsers.map((user) => (
          <motion.div
            key={user.clientID}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: user.cursor.x,
              y: user.cursor.y 
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            className="absolute top-0 left-0 flex flex-col items-start"
          >
            <MousePointer2 
              size={20} 
              fill={user.color} 
              stroke="white" 
              strokeWidth={1.5}
              className="drop-shadow-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg backdrop-blur-md"
              style={{ backgroundColor: `${user.color}cc` }}
            >
              {user.name}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default PresenceLayer;
