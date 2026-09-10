import React from 'react';
import { motion } from 'framer-motion';
import { X, ListMusic, Shuffle } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { trackById } from './playback';

/**
 * "Up Next": the explicit queue (removable, consumable rows) followed by a peek at the
 * tracks the context will feed the resolver afterwards. `upcoming` comes from the
 * parent because only it holds the live context; with shuffle on the order is the
 * bag's secret, so the panel says so instead of predicting an order the resolver will
 * not follow.
 */
const UpNextPanel = ({ onClose, upcoming, shuffle, contextLabel }) => {
  const queue = useOSStore((s) => s.music.queue);
  const playContext = useOSStore((s) => s.music.playContext);
  const dequeue = useOSStore((s) => s.dequeue);
  const clearQueue = useOSStore((s) => s.clearQueue);
  const setMusicTrack = useOSStore((s) => s.setMusicTrack);

  const queueTracks = queue.map((id) => trackById(id)).filter(Boolean);

  const playQueued = (index, track) => {
    // Playing a queued row consumes it — the queue is a to-do list, not a playlist.
    dequeue(index);
    setMusicTrack(track, playContext);
  };

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="absolute right-0 top-0 bottom-24 w-full max-w-xs bg-sdl-surface/95 backdrop-blur-xl border-l border-hairline/10 z-30 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-hairline/10">
        <h4 className="text-sm font-black tracking-tight flex items-center gap-2 text-sdl-ink">
          <ListMusic size={16} className="text-os-primary" /> Up Next
        </h4>
        <div className="flex items-center gap-1">
          {queueTracks.length > 0 && (
            <button
              onClick={clearQueue}
              className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant hover:text-sdl-alert hover:bg-veil/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close Up Next"
            className="p-1.5 rounded-lg text-os-onSurfaceVariant hover:text-sdl-ink hover:bg-veil/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant px-1 mb-2">
            In queue
          </p>
          {queueTracks.length === 0 ? (
            <p className="text-xs text-os-onSurfaceVariant px-1 py-3 font-medium">
              Nothing queued. Use a track&apos;s menu to Play next or Add to queue.
            </p>
          ) : (
            queueTracks.map((track, i) => (
              <div
                key={`${track.id}-${i}`}
                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-veil/5 cursor-pointer transition-colors"
                onMouseDown={() => playQueued(i, track)}
              >
                <img src={track.cover} alt="" className="w-9 h-9 rounded-lg object-cover border border-hairline/10 shrink-0" />
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold truncate text-sdl-ink">{track.title}</p>
                  <p className="text-[10px] text-os-onSurfaceVariant truncate">{track.artist}</p>
                </div>
                <button
                  aria-label={`Remove ${track.title} from queue`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    dequeue(i);
                  }}
                  className="p-1 rounded-lg text-os-onSurfaceVariant hover:text-sdl-alert opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant px-1 mb-2">
            From {contextLabel}
          </p>
          {shuffle ? (
            <p className="text-xs text-os-onSurfaceVariant px-1 py-3 font-medium flex items-center gap-2">
              <Shuffle size={13} className="text-os-primary shrink-0" />
              Shuffle is on — the order is drawn from a no-repeat bag.
            </p>
          ) : upcoming.length === 0 ? (
            <p className="text-xs text-os-onSurfaceVariant px-1 py-3 font-medium">End of the line.</p>
          ) : (
            upcoming.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-veil/5 cursor-pointer transition-colors"
                onMouseDown={() => setMusicTrack(track, playContext)}
              >
                <img src={track.cover} alt="" className="w-9 h-9 rounded-lg object-cover border border-hairline/10 shrink-0 opacity-80" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-sdl-ink/80">{track.title}</p>
                  <p className="text-[10px] text-os-onSurfaceVariant truncate">{track.artist}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UpNextPanel;
