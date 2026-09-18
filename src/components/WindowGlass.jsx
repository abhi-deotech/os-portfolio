import React from 'react';

/**
 * The window's inner veil: a tint and a hairline, nothing more.
 *
 * This layer used to carry its own `backdrop-blur-2xl` — `inset-0` inside a window root that is
 * ALREADY `backdrop-blur-2xl`/`3xl`. The inner layer's backdrop is the outer layer's already-blurred
 * output, so every window paid two full-size backdrop passes for one visible blur. It also took
 * `width`/`height`/`isActive` props fed by a per-window ResizeObserver → setState loop and read none
 * of them. Both are gone.
 */
const WindowGlass = () => {
  return (
    <div className="absolute inset-0 bg-veil/5 -z-10 pointer-events-none rounded-[inherit] border border-hairline/10" />
  );
};

export default WindowGlass;
