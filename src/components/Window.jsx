import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile, useMediaQuery } from '../hooks/useMediaQuery';
import useCapability from '../capabilities/useCapability.js';
import { popoutPolicy } from '../config/popout.js';
import { closePopout, getPopout, openPopout } from '../utils/popout.js';
import { loadPopoutHost } from './popoutHostLoader.js';
import { osAlert } from '../utils/dialog';
import useSoundEffects from '../hooks/useSoundEffects';
import WindowGlass from './WindowGlass';
import { MENU_BAR_H } from './MenuBar';
import { useWorkArea } from './workArea';

const POPOUT_MENU_ITEM =
  'w-full text-left px-2.5 py-1.5 text-[12px] text-sdl-ink rounded-sdl-sm cursor-pointer ' +
  'hover:bg-sdl-soft focus:bg-sdl-soft focus:outline-none transition-colors duration-hover ease-sdl';

/**
 * Window container component for Lumina OS applications.
 * Provides a draggable, resizable window frame with title bar and traffic light controls.
 *
 * Features:
 * - Drag functionality with snap-to-maximize (drag to top edge)
 * - Traffic light buttons (close, minimize, maximize)
 * - Active/inactive visual states
 * - Mobile-responsive (always maximized on mobile)
 * - Spring animations via Framer Motion
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.id - Unique window identifier
 * @param {string} props.title - Window title displayed in title bar
 * @param {React.ReactNode} props.children - Window content
 * @param {number} [props.width=900] - Default window width
 * @param {number} [props.height=650] - Default window height
 * @param {number} [props.minWidth=400] - Minimum resize width
 * @param {number} [props.minHeight=300] - Minimum resize height
 */
const Window = ({ id, title, children, isMinimized, width: baseWidth = 900, height: baseHeight = 650, minWidth = 400, minHeight = 300 }) => {
  // A smaller work area (wallpaper mode) shrinks a window that would not fit inside it.
  const area = useWorkArea();
  const width = area ? Math.max(Math.min(baseWidth, area.width - 32), Math.min(minWidth, area.width)) : baseWidth;
  const height = area ? Math.max(Math.min(baseHeight, area.height - 32), Math.min(minHeight, area.height)) : baseHeight;
  // Selectors, not `useOSStore()`. A whole-store subscription re-renders this component on
  // every state change anywhere in the OS, not just the fields it reads.
  const closeWindow = useOSStore((s) => s.closeWindow);
  const toggleMinimizeWindow = useOSStore((s) => s.toggleMinimizeWindow);
  const toggleMaximizeWindow = useOSStore((s) => s.toggleMaximizeWindow);
  const snapWindow = useOSStore((s) => s.snapWindow);
  const focusWindow = useOSStore((s) => s.focusWindow);
  const activeWindow = useOSStore((s) => s.activeWindow);
  const maximizedWindows = useOSStore((s) => s.maximizedWindows);
  const snappedWindows = useOSStore((s) => s.snappedWindows);
  const setIsDragging = useOSStore((s) => s.setIsDragging);
  const isDragging = useOSStore((s) => s.isDragging);
  const transparencyEffects = useOSStore((s) => s.transparencyEffects);
  const isMobile = useIsMobile();
  const { playSound } = useSoundEffects();
  const isActive = activeWindow === id;
  const isMaximized = maximizedWindows?.includes(id) || isMobile;
  const dragControls = useDragControls();
  const windowRef = useRef(null);

  /* ── Pop-out ──────────────────────────────────────────────────────────────────────────────────
     Curated apps only (src/config/popout.js); the rest say why in the button's tooltip. The button
     exists only for a fine pointer that can hover — an input-capability check, not browser detection. */
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const policy = popoutPolicy(id);
  const documentPip = useCapability('documentPip');
  const windowManagement = useCapability('windowManagement');
  const popOutWindow = useOSStore((s) => s.popOutWindow);
  const pipFloating = useOSStore((s) => Object.values(s.poppedOut || {}).some((p) => p?.mode === 'pip'));
  const [popoutMenu, setPopoutMenu] = useState(null); // null | { screens: [...] | null, denied }
  const popoutMenuOpen = popoutMenu !== null;
  const popoutReasonId = useId();
  const popoutDeniedId = useId();
  const popoutButtonRef = useRef(null);
  const popoutMenuRef = useRef(null);
  // `isExtended` is only exposed with Window Management; a detached second screen needs a re-render
  // (any hover over the window does it) before the menu appears. `supported`, not `available`: a
  // denied permission still gets the menu, with "Pop out here" and the line saying why.
  const screenIsExtended = typeof window !== 'undefined' && window.screen?.isExtended === true;
  const multiScreen = policy.allowed && windowManagement.supported && screenIsExtended;
  const popoutLabel = !documentPip.supported
    ? `Pop out (opens as a separate window; always-on-top needs Document Picture-in-Picture, which ${documentPip.browser?.name ?? 'this browser'} lacks)`
    : pipFloating
      ? 'Pop out (opens as a separate window; only one window can float on top)'
      : 'Pop out (floats above other windows)';

  useEffect(() => {
    if (isMobile && !maximizedWindows?.includes(id)) {
      toggleMaximizeWindow(id);
    }
  }, [isMobile, id, maximizedWindows, toggleMaximizeWindow]);

  // The focused-window accent was a four-entry hex map keyed off the retired `activeAccent`
  // preset, so it stayed neon purple no matter which of the sixteen colorways was active. These
  // are all CSS-expressible, so they read the role directly and need no JS at all.
  const ACCENT = 'var(--sdl-accent)';
  const ACTIVE_SHADOW = '0 32px 64px rgb(var(--sdl-plane-rgb) / 0.5), 0 0 20px rgb(var(--sdl-accent-rgb) / 0.2)';

  const isSnapped = snappedWindows?.[id];

  /**
   * Maximized and edge-snapped windows are `position: fixed`, so they measure from the viewport,
   * not from the App shell's flex column — which means they do NOT inherit the menu bar's offset
   * the way the Desktop layer does. Without this they start at y=0 and their own title bar (traffic
   * lights included) renders underneath the bar, which paints above them.
   *
   * 0 on mobile: MenuBar returns null there, so there is nothing to clear.
   */
  const topInset = isMobile ? 0 : (area?.top ?? MENU_BAR_H);

  /**
   * One height for both the Framer `animate` target and the inline `style`. They previously
   * disagreed — `style` said `calc(100vh - 80px)` on mobile while `animate` said a flat `100%`, and
   * animate wins, so a maximized window has been overshooting the bottom of the screen by the
   * height of whatever chrome it was supposed to clear.
   */
  const fillHeight = isMobile
    ? 'calc(100vh - 80px)'
    : `calc(100vh - ${topInset + (area?.bottom ?? 0)}px)`;

  /**
   * Horizontal geometry of a maximized or snapped window. On the desktop that is the whole viewport
   * and its halves; inside a work area, the area and its halves.
   */
  const fill = area && !isMobile
    ? (() => {
      const half = `calc((100vw - ${area.left + area.right}px) / 2)`;
      return {
        left: area.left,
        right: area.right,
        bottom: area.bottom,
        width: `calc(100vw - ${area.left + area.right}px)`,
        half,
        rightHalfLeft: `calc(${area.left}px + ${half})`,
        leftHalfRight: `calc(${area.right}px + ${half})`,
      };
    })()
    : { left: 0, right: 0, bottom: 0, width: '100%', half: '50vw', rightHalfLeft: '50vw', leftHalfRight: '50vw' };

  useEffect(() => {
    if (!isActive || isMobile) return;

    const handleKeyDown = (e) => {
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          snapWindow(id, 'left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          snapWindow(id, 'right');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isMaximized) {
            toggleMaximizeWindow(id);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (isMaximized) {
            toggleMaximizeWindow(id);
          } else if (isSnapped) {
            snapWindow(id, null);
          } else {
            toggleMinimizeWindow(id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isMobile, id, isMaximized, isSnapped, snapWindow, toggleMaximizeWindow, toggleMinimizeWindow]);

  const windowMotionProps = isMobile ? {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  } : {
    initial: { scale: 0.95, opacity: 0, x: -width/2, y: -height/2 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      ...(isMaximized ? { top: topInset, left: fill.left, right: fill.right, bottom: fill.bottom, width: fill.width, height: fillHeight, borderRadius: 0, x: 0, y: 0 } : {}),
      ...(isSnapped ? {
        top: topInset,
        left: isSnapped === 'right' ? fill.rightHalfLeft : fill.left,
        width: fill.half,
        height: fillHeight,
        borderRadius: 0,
        x: 0,
        y: 0
      } : {})
    },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  };

  const [snapTarget, setSnapTarget] = useState(null);

  const handleDrag = (e, info) => {
    const { x, y } = info.point;
    const threshold = 50;
    // Edges of the work area, not of the viewport: in wallpaper mode those are the Stage Manager
    // strip and the widget column.
    const edge = area && !isMobile ? area : { top: 0, left: 0, right: 0 };
    if (y < edge.top + threshold) setSnapTarget('top');
    else if (x < edge.left + threshold) setSnapTarget('left');
    else if (window.innerWidth - x < edge.right + threshold) setSnapTarget('right');
    else setSnapTarget(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (snapTarget === 'top') {
      toggleMaximizeWindow(id);
    } else if (snapTarget === 'left') {
      snapWindow(id, 'left');
    } else if (snapTarget === 'right') {
      snapWindow(id, 'right');
    }
    setSnapTarget(null);
  };

  const closePopoutMenu = () => {
    setPopoutMenu(null);
    popoutButtonRef.current?.focus();
  };

  /**
   * Pop this window out. `openPopout` must be the first thing that runs: Document PiP and
   * window.open both need this click's user activation. Its chunk (PopoutHost) loads after the
   * window is open and before the store flips, so WindowSlot can adopt the DOM in one commit.
   */
  const popOut = async (placement) => {
    const pending = openPopout(id, { title, width, height, placement });
    // From the menu: hand focus back to the button, so a failed pop-out (blocked, rejected) doesn't
    // leave keyboard focus on <body> behind the warning. On success the window unmounts anyway.
    if (popoutMenuOpen) closePopoutMenu();
    const entry = await pending;
    if (!entry) return;
    try {
      await loadPopoutHost();
    } catch (err) {
      closePopout(id);
      osAlert({ tone: 'warn', title: `Couldn't open a floating window (${err?.name ?? 'Error'}). Try again.` });
      return;
    }
    if (getPopout(id) !== entry || entry.win?.closed) {
      closePopout(id);
      return;
    }
    popOutWindow(id, entry.mode);
  };

  const handlePopoutClick = () => {
    if (!policy.allowed) return; // aria-disabled: the tooltip says why
    if (!multiScreen) {
      popOut();
      return;
    }
    if (popoutMenuOpen) {
      closePopoutMenu();
      return;
    }
    if (windowManagement.status === 'denied') {
      // Asking again would reject without a prompt; say why other screens are missing.
      setPopoutMenu({ screens: [], denied: true });
      return;
    }
    setPopoutMenu({ screens: null, denied: false });
    // getScreenDetails runs on this click (it may prompt). Denied → only "Pop out here" plus a line.
    // `request` is async but calls getScreenDetails before its first await, inside this activation.
    (windowManagement.request ? windowManagement.request() : Promise.reject(new Error('unavailable')))
      .then(
        (details) => {
          const all = details?.screens ?? [];
          const others = all.filter((s) => s !== details.currentScreen);
          setPopoutMenu((m) => m && {
            ...m,
            // Unlabelled screens are numbered across ALL screens, so a number names one physical screen.
            screens: others.map((s) => ({
              key: `${s.availLeft},${s.availTop},${all.indexOf(s)}`,
              label: s.label || `screen ${all.indexOf(s) + 1}`,
              left: s.availLeft,
              top: s.availTop,
            })),
          });
        },
        () => setPopoutMenu((m) => m && { ...m, screens: [], denied: true }),
      );
  };

  const handlePopoutMenuKeyDown = (e) => {
    const items = Array.from(popoutMenuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(e.currentTarget.ownerDocument.activeElement);
    let next = null;
    switch (e.key) {
      case 'ArrowDown': next = items[(index + 1) % items.length]; break;
      case 'ArrowUp': next = items[index <= 0 ? items.length - 1 : index - 1]; break;
      case 'Home': next = items[0]; break;
      case 'End': next = items[items.length - 1]; break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closePopoutMenu();
        return;
      case 'Tab':
        setPopoutMenu(null);
        return;
      default:
        return;
    }
    e.preventDefault();
    next?.focus();
  };

  // Opening focuses the first item; a press outside closes the menu and returns focus to the button.
  useEffect(() => {
    if (!popoutMenuOpen) return undefined;
    popoutMenuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onPointerDown = (e) => {
      if (popoutMenuRef.current?.contains(e.target) || popoutButtonRef.current?.contains(e.target)) return;
      setPopoutMenu(null);
      popoutButtonRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [popoutMenuOpen]);

  /**
   * THE FRAME OWNS THE CORNER. This element is `overflow: hidden` with `rounded-sdl-panel` (the
   * shell's panel radius, `--sdl-radius-panel`, the same token the dialog and the widgets use), so
   * every app is clipped to the same corner and needs no radius of its own. Several apps used to
   * add a `rounded-xl` / `rounded-2xl` / `rounded-b-2xl` on their root — a second, smaller radius
   * inside the frame that left a sliver of window glass showing at each corner — while the rest
   * ran square and filled the frame. That is why some apps looked rounded and some looked 90°.
   * App roots are full-bleed now; inner cards keep their own (smaller) radii, per SDL.
   */
  return (
    <>
      <AnimatePresence>
        {snapTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            /* Inline top wins over the inset-* class, so the preview lands where the window
               actually will — under the menu bar, not over it. */
            style={area && !isMobile ? {
              top: topInset + 16,
              bottom: area.bottom + 16,
              left: snapTarget === 'right' ? `calc(${fill.rightHalfLeft} + 8px)` : area.left + 16,
              right: snapTarget === 'left' ? `calc(${fill.leftHalfRight} + 8px)` : area.right + 16,
              width: 'auto',
            } : { top: topInset + 16 }}
            className={`fixed z-[40] bg-os-primary/10 border-2 border-os-primary/30 backdrop-blur-sm transition-all duration-300 pointer-events-none ${
              snapTarget === 'top' ? 'inset-4 rounded-sdl-panel' :
              snapTarget === 'left' ? 'inset-y-4 left-4 w-[48%] rounded-sdl-panel' :
              'inset-y-4 right-4 w-[48%] rounded-sdl-panel'
            }`}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={windowRef}
        drag={!isMaximized && !isMobile && !isSnapped}
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        {...windowMotionProps}
        animate={{
          ...windowMotionProps.animate,
          opacity: isMinimized ? 0 : 1,
          scale: isMinimized ? 0.9 : 1,
          y: isMinimized ? 40 : (isMaximized || isSnapped ? 0 : -height/2),
          pointerEvents: isMinimized ? 'none' : 'auto',
        }}
        onMouseDown={() => focusWindow(id)}
        style={{
          ...(!isMaximized && !isSnapped ? { width, height, minWidth, minHeight, top: '50%', left: '50%' } : { 
            position: 'fixed',
            top: topInset,
            left: isSnapped === 'right' ? fill.rightHalfLeft : fill.left,
            right: isSnapped === 'left' ? fill.leftHalfRight : fill.right,
            bottom: isMobile ? '80px' : fill.bottom,
            width: isSnapped ? fill.half : (area && !isMobile ? fill.width : '100vw'),
            height: fillHeight,
            x: 0,
            y: 0
          }),
          zIndex: isActive ? 50 : 10,
          borderColor: isActive && !isMaximized && !isSnapped ? ACCENT : undefined,
          boxShadow: isActive && !isMaximized && !isSnapped ? ACTIVE_SHADOW : undefined,
          resize: (isMaximized || isSnapped || isMobile) ? 'none' : 'both',
          overflow: 'hidden'
        }}
        className={`absolute flex flex-col transition-shadow duration-300 pointer-events-auto group/window ${
          isActive ? 'border' : 'grayscale-[0.1] border border-os-outline/10 shadow-[0_16px_32px_rgb(var(--sdl-plane-rgb)/0.3)]'
        } ${!isMaximized && !isSnapped ? `bg-os-surfaceContainerHighest/50 ${transparencyEffects ? 'backdrop-blur-2xl' : ''} rounded-sdl-panel` : `bg-os-surface/95 ${transparencyEffects ? 'backdrop-blur-3xl' : ''}`}`}
      >
      {/* Title Bar - Glassmorphic Strip */}
      <div 
        className={`${isMobile ? 'h-16' : 'h-14'} flex items-center px-6 border-b border-os-outline/5 relative shrink-0 transition-all duration-300`}
        onPointerDown={(e) => {
          if (isSnapped) {
            snapWindow(id, null);
            dragControls.start(e);
          } else if (!isMaximized && !isMobile) {
            dragControls.start(e);
          }
        }}
        onDoubleClick={() => !isMobile && toggleMaximizeWindow(id)}
        style={{ 
          touchAction: "none", 
          cursor: (isMaximized || isMobile) ? 'default' : 'grab',
          backgroundColor: isActive
            ? 'rgb(var(--sdl-accent-rgb) / 0.08)'
            : 'rgb(var(--sdl-surface-2-rgb) / 0.4)'
        }}
      >
        <div className="flex space-x-2.5 z-50 w-24 group/controls" onPointerDown={(e) => e.stopPropagation()}>
          <button 
            type="button"
            onClick={() => { closeWindow(id); playSound('close'); }}
            aria-label="Close window"
            title="Close"
            className={`${isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#e0443e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-hairline/60`}
          >
            <CustomIcon icon={X} size={isMobile ? 12 : 10} strokeWidth={4} color="text-[#4c0000]" className={`${isMobile ? 'opacity-100' : 'opacity-0'} group-hover/controls:opacity-100 transition-opacity`} animate={false} />
          </button>
          {!isMobile && (
            <>
              <button
               type="button"
               onClick={() => { toggleMinimizeWindow(id); playSound('click'); }}
               aria-label="Minimize window"
               title="Minimize"
               className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#dea123] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-hairline/60"
              >
                <CustomIcon icon={Minus} size={10} strokeWidth={4} color="text-[#5c3e00]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
              </button>
              <button
                type="button"
                onClick={() => { toggleMaximizeWindow(id); playSound('click'); }}
                aria-label={isMaximized ? "Restore window" : "Maximize window"}
                title={isMaximized ? "Restore" : "Maximize"}
                className="w-3.5 h-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#1aab29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-hairline/60"
              >
                {isMaximized ? (
                  <CustomIcon icon={Minimize2} size={9} strokeWidth={4} color="text-[#004d09]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
                ) : (
                  <CustomIcon icon={Maximize2} size={9} strokeWidth={4} color="text-[#004d09]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
                )}
              </button>
              {canHover && (
                // -my keeps the 24px hit area from pushing the 14px lights off their centre line.
                <span className="relative inline-flex -my-[5px]">
                  <button
                    ref={popoutButtonRef}
                    type="button"
                    onClick={handlePopoutClick}
                    aria-label={policy.allowed ? popoutLabel : 'Pop out'}
                    title={policy.allowed ? popoutLabel : policy.reason}
                    aria-disabled={policy.allowed ? undefined : 'true'}
                    aria-describedby={policy.allowed ? undefined : popoutReasonId}
                    aria-haspopup={multiScreen ? 'menu' : undefined}
                    aria-expanded={multiScreen ? popoutMenuOpen : undefined}
                    className={`w-6 h-6 flex items-center justify-center rounded-sdl-sm relative z-50 transition-opacity duration-hover ease-sdl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline/60 ${
                      popoutMenuOpen ? 'opacity-100 text-sdl-ink' : 'opacity-0 group-hover/window:opacity-100 text-sdl-sec'
                    } ${policy.allowed ? 'cursor-pointer hover:text-sdl-ink' : 'cursor-default'}`}
                  >
                    <PictureInPicture2 size={12} aria-hidden="true" />
                  </button>
                  {!policy.allowed && <span id={popoutReasonId} className="sr-only">{policy.reason}</span>}
                  {popoutMenuOpen && (
                    // The menu holds menuitems only; the denied line is a sibling in the same panel,
                    // described onto "Pop out here" (where focus lands) so screen readers announce it.
                    <div
                      ref={popoutMenuRef}
                      onKeyDown={handlePopoutMenuKeyDown}
                      className="glass rounded-sdl-sm shadow-lift absolute left-0 top-full mt-1 z-50 min-w-[190px] p-1"
                    >
                      <div role="menu" aria-label="Pop out">
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={-1}
                          aria-describedby={popoutMenu.denied ? popoutDeniedId : undefined}
                          className={POPOUT_MENU_ITEM}
                          onClick={() => popOut()}
                        >
                          Pop out here
                        </button>
                        {popoutMenu.screens?.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            className={POPOUT_MENU_ITEM}
                            onClick={() => popOut({ left: s.left, top: s.top })}
                          >
                            Move to {s.label}
                          </button>
                        ))}
                      </div>
                      {popoutMenu.denied && (
                        <p id={popoutDeniedId} className="px-2.5 py-1.5 text-[11px] text-sdl-sec">
                          Other screens need the window management permission.
                        </p>
                      )}
                    </div>
                  )}
                </span>
              )}
            </>
          )}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-os-onSurfaceVariant text-sm font-semibold tracking-wide font-sans">{title}</span>
        </div>
      </div>

      {/* Inner veil. No size props: a ResizeObserver used to feed width/height into React state on
          every frame of a native resize drag, re-rendering the whole frame for values WindowGlass
          never read. */}
      <WindowGlass />

      {/* Content Area */}
      <div className="flex-grow overflow-auto text-os-onSurface relative scrollbar-os pb-10">
        {/* Subtle Ambient Glow behind content */}
        <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-os-primaryDim/5 to-transparent pointer-events-none -z-10 rounded-full blur-3xl opacity-50" />
        
        {/* Drag Overlay to prevent iframe event swallowing */}
        {isDragging && (
          <div className="absolute inset-0 z-[9999] cursor-grabbing pointer-events-auto" />
        )}
        
        {children}
      </div>

      {/* Resize Handle (Visual Only for now as native resize is enabled) */}
      {!isMaximized && !isMobile && (
        <div className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover/window:opacity-100 transition-opacity z-50 pointer-events-none">
           <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-os-outline/30 blur-[1px]" />
        </div>
      )}
    </motion.div>
    </>
  );
};

export default Window;
