import React from 'react';
import { motion } from 'framer-motion';

/**
 * CustomIcon Component
 * Wraps Lucide icons with premium OS-style effects and animations.
 * 
 * @param {React.ElementType} icon - The Lucide icon component to render.
 * @param {number} size - Size of the icon (default: 20).
 * @param {string} color - Text color class or hex (default: 'currentColor').
 * @param {number} strokeWidth - Stroke thickness (default: 1.5).
 * @param {boolean|string} glow - Add a glow effect. If string, uses as shadow color.
 * @param {string} className - Additional CSS classes.
 * @param {boolean} animate - Enable hover animations (default: true).
 */
const CustomIcon = ({ 
  icon: Icon, 
  size = 20, 
  color = 'currentColor', 
  strokeWidth = 1.5,
  glow = false,
  className = '',
  animate = true,
  ...props
}) => {
  if (!Icon) return null;

  const glowStyle = glow 
    ? { filter: `drop-shadow(0 0 8px ${typeof glow === 'string' ? glow : 'rgba(var(--os-primary-rgb), 0.5)'})` }
    : {};

  const motionProps = animate ? {
    whileHover: { scale: 1.1, rotate: [0, -5, 5, 0] },
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  } : {};

  return (
    <motion.div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={glowStyle}
      {...motionProps}
    >
      <Icon 
        size={size} 
        color={color.startsWith('#') || color.startsWith('rgb') ? color : undefined}
        className={!color.startsWith('#') && !color.startsWith('rgb') ? color : ''}
        strokeWidth={strokeWidth}
        {...props}
      />
    </motion.div>
  );
};

export default CustomIcon;
