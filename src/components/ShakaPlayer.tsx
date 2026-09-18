import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";

type Props = {
  src: string;
  poster?: string | undefined;
  title?: string | undefined;
  autoPlay?: boolean;
  /** "mp4" plays progressively; "dash"/"hls" go through Shaka (DRM-ready). */
  kind?: "mp4" | "dash" | "hls";
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Protected playback surface with a modern custom control bar.
 * - Shaka Player handles playback (DRM-ready: encrypted DASH/HLS can be swapped in later)
 * - the media address is an expiring ticket served by our own proxy
 * - download / remote playback / picture-in-picture / right-click are blocked
 */
export default function ShakaPlayer({ src, poster, title, autoPlay = true, kind = "mp4" }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    let destroyed = false;
    let player: { destroy: () => Promise<void> } | null = null;

    const video = videoRef.current;
    if (!video) return;

    (async () => {
      try {
        const shaka = (await import("shaka-player/dist/shaka-player.compiled.js")) as any;
        const lib = shaka.default ?? shaka;
        lib.polyfill?.installAll?.();

        if (kind === "mp4" || !lib.Player.isBrowserSupported()) {
          // Progressive media: played straight from the expiring proxy ticket.
          video.src = src;
          video.load();
          if (autoPlay) video.play().catch(() => {});
          return;
        }

        const instance = new lib.Player();
        player = instance;
        await instance.attach(video);

        instance.configure({
          streaming: { bufferingGoal: 20 },
          drm: {
            // Widevine / PlayReady / FairPlay licence servers plug in here
            // once the films are packaged as encrypted DASH or HLS.
            servers: {},
          },
        });

        instance.addEventListener("error", (event: any) => {
          setError("This film could not be played right now.");
          console.error("shaka error", event?.detail);
        });

        if (destroyed) return;
        await instance.load(src, null, "video/mp4");
        if (autoPlay) video.play().catch(() => {});
      } catch (err) {
        console.error(err);
        if (!destroyed) setError("This film could not be played right now.");
      }
    })();

    return () => {
      destroyed = true;
      player?.destroy().catch(() => {});
    };
  }, [src, autoPlay, kind]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const wake = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2800);
  }, []);

  useEffect(() => {
    wake();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [wake]);

  const video = () => videoRef.current;

  const togglePlay = () => {
    const element = video();
    if (!element) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
    wake();
  };

  const skip = (seconds: number) => {
    const element = video();
    if (!element) return;
    element.currentTime = Math.min(
      Math.max(0, element.currentTime + seconds),
      element.duration || Infinity,
    );
    wake();
  };

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await wrap.requestFullscreen().catch(() => {});
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`secure-player${controlsVisible || !playing ? " show-ui" : ""}`}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onMouseMove={wake}
      onTouchStart={wake}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="auto"
        controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
        disablePictureInPicture
        disableRemotePlayback
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setReady(false)}
        onPlaying={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => {
          const element = event.currentTarget;
          setCurrent(element.currentTime);
          if (element.buffered.length) {
            setBuffered(element.buffered.end(element.buffered.length - 1));
          }
        }}
        onVolumeChange={(event) => {
          setMuted(event.currentTarget.muted);
          setVolume(event.currentTarget.volume);
        }}
        aria-label={title}
      />

      {!ready && !error && (
        <span className="player-spinner" aria-hidden="true">
          <Loader2 size={30} />
        </span>
      )}

      {!playing && ready && !error && (
        <button type="button" className="player-bigplay" onClick={togglePlay} aria-label="Play">
          <Play size={30} />
        </button>
      )}

      <div className="player-controls">
        {title && <span className="player-title">{title}</span>}

        <div
          className="player-scrub"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onClick={(event) => {
            const element = video();
            if (!element || !duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            element.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <span className="player-scrub-buffer" style={{ width: `${bufferPercent}%` }} />
          <span className="player-scrub-fill" style={{ width: `${progress}%` }}>
            <i />
          </span>
        </div>

        <div className="player-bar">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button type="button" onClick={() => skip(-10)} aria-label="Back 10 seconds">
            <RotateCcw size={16} />
          </button>
          <button type="button" onClick={() => skip(10)} aria-label="Forward 10 seconds">
            <RotateCw size={16} />
          </button>

          <span className="player-time">
            {formatTime(current)} <i>/</i> {formatTime(duration)}
          </span>

          <div className="player-volume">
            <button
              type="button"
              onClick={() => {
                const element = video();
                if (element) element.muted = !element.muted;
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const element = video();
                if (!element) return;
                element.muted = false;
                element.volume = Number(event.target.value);
              }}
              aria-label="Volume"
            />
          </div>

          <button
            type="button"
            className="player-fs"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="player-error">{error}</p>}
    </div>
  );
}
