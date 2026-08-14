import React from 'react';
import { motion } from 'framer-motion';

/**
 * CustomIcon — a Lucide glyph with the OS's motion grammar. CHROME ONLY.
 *
 * It used to also resolve the app icon theme, with `themed` defaulting to true. That meant every
 * chevron, slider handle and panel header in the OS was recoloured by a setting whose name and
 * description are about *app* icons: picking "Outline" turned the entire interface — Control
 * Center, Settings, window controls — a uniform muted grey. That was a large part of why the icon
 * themes read as broken.
 *
 * App icons now go through `AppIcon`, which owns theming. This component stays deliberately dumb.
 *
 * @param {React.ElementType} icon - The Lucide icon component to render.
 * @param {number} size - Size of the icon (default: 20).
 * @param {string} color - Text color class or hex (default: 'currentColor').
 * @param {number} strokeWidth - Stroke thickness (default: 1.5).
 * @param {boolean|string} glow - Add a glow effect. If string, uses it as the shadow colour.
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

  // --sdl-glow resolves to `transparent` under a light colorway, so halos — which are dark-mode
  // grammar — never survive onto a paper-flat plane.
  const glowStyle = glow
    ? { filter: `drop-shadow(0 0 8px ${typeof glow === 'string' ? glow : 'var(--sdl-glow)'})` }
    : {};

  const motionProps = animate
    ? {
      // Scale only. The old four-keyframe rotate was decoration rather than a state, and it fired a
      // fourth competing spring alongside the parent button's own hover.
      whileHover: { scale: 1.04 },
      whileTap: { scale: 0.97 },
      transition: { type: 'spring', stiffness: 400, damping: 17 },
    }
    : {};

  const useClass = typeof color === 'string'
    && !color.startsWith('#')
    && !color.startsWith('rgb')
    && !color.startsWith('var(');

  return (
    <motion.div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={glowStyle}
      {...motionProps}
    >
      <Icon
        size={size}
        color={useClass ? undefined : color}
        className={useClass ? color : ''}
        strokeWidth={strokeWidth}
        {...props}
      />
    </motion.div>
  );
};

export default CustomIcon;
