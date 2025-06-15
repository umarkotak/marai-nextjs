import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Clock, Music } from 'lucide-react';
import { Button } from './ui/button';
import maraiAPI from '@/apis/maraiAPI';
import { toast } from 'react-toastify';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

const TranscriptTimeline = ({
  taskDetail,
  transcriptInfo,
  activeTranscriptLine,
  setActiveTranscriptLine,
}) => {
  // Single audio reference for the main wav file
  const mainAudioRef = useRef(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(null);

  async function GetTranscriptInfo(tempTranscriptInfo) {
    try {
      if (!tempTranscriptInfo.duration_ms) { return }

      setDuration(tempTranscriptInfo.duration_ms)

      var tmpTrackLayers = []

      if (!tempTranscriptInfo.transcript?.id) { return }

      tmpTrackLayers.push({
        id: tempTranscriptInfo.transcript?.id,
        name: tempTranscriptInfo.transcript?.speaker,
        color: 'hsl(221.2 83.2% 53.3%)',
        volume: 1,
        audioUrl: tempTranscriptInfo?.wav_url,
        segments: tempTranscriptInfo.transcript?.transcript_lines.map((segment) => ({
          id: segment?.id,
          startTime: segment.start_at_ms,
          endTime: segment.end_at_ms,
          waveform: generateWaveform(150),
          name: segment?.speaker,
          speaker: segment?.speaker,
          value: segment.value,
          transcript_line: segment,
        }))
      })

      setTrackLayers(tmpTrackLayers)

      // Load the main audio file
      if (tempTranscriptInfo?.wav_url) {
        loadMainAudio(tempTranscriptInfo.wav_url);
      }

      setCurrentTime(0)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    const segmentStartTime = activeTranscriptLine.start_at_ms;
    setCurrentTime(segmentStartTime);

    // Seek audio to segment start
    if (mainAudioRef.current && audioLoaded) {
      mainAudioRef.current.currentTime = segmentStartTime / 1000;
    }
  }, [activeTranscriptLine])

  // Load the main audio file
  const loadMainAudio = useCallback((audioUrl) => {
    if (mainAudioRef.current) {
      mainAudioRef.current.src = '';
      mainAudioRef.current = null;
    }

    const audio = new Audio();
    audio.src = audioUrl;
    audio.preload = 'auto';

    audio.addEventListener('loadeddata', () => {
      console.log('Main audio loaded successfully');
      setAudioLoaded(true);
      setAudioError(null);
    });

    audio.addEventListener('error', (e) => {
      console.error('Failed to load main audio:', e);
      setAudioError('Failed to load audio file');
      setAudioLoaded(false);
    });

    audio.addEventListener('timeupdate', () => {
      const currentTimeMs = Math.round(audio.currentTime * 1000);
      setCurrentTime(currentTimeMs);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(duration);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    mainAudioRef.current = audio;
  }, []);

  useEffect(() => {
    GetTranscriptInfo(transcriptInfo)
  }, [taskDetail, transcriptInfo])

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60000); // 60 seconds in ms
  const [volume, setVolume] = useState(0.8);
  const [zoom, setZoom] = useState(2);
  const [trackLayers, setTrackLayers] = useState([]);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  const timelineRef = useRef(null);

  // Generate mock waveform data
  function generateWaveform(points) {
    return Array.from({ length: points }, (_, i) =>
      Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3 + 0.2
    );
  }

  // Convert time to pixels
  const timeToPixels = useCallback((timeMs) => {
    const pixelsPerMs = (800 * zoom) / duration;
    return timeMs * pixelsPerMs;
  }, [duration, zoom]);

  // Convert pixels to time
  const pixelsToTime = useCallback((pixels) => {
    const pixelsPerMs = (800 * zoom) / duration;
    return Math.round(pixels / pixelsPerMs);
  }, [duration, zoom]);

  // Also improve the formatTime function for better readability at different scales:
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    // For durations over 1 hour, show hours
    if (duration >= 3600000) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    // For durations over 10 minutes, don't show milliseconds to save space
    if (duration >= 600000) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Default format with milliseconds
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // Add a backup timer to ensure timeline updates even if timeupdate events are missed
  useEffect(() => {
    let intervalId;

    if (isPlaying && mainAudioRef.current && audioLoaded) {
      intervalId = setInterval(() => {
        if (mainAudioRef.current) {
          const currentTimeMs = Math.round(mainAudioRef.current.currentTime * 1000);
          setCurrentTime(currentTimeMs);
        }
      }, 100); // Update every 100ms for smooth playback
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, audioLoaded]);

  // Update audio volume when master volume changes
  useEffect(() => {
    if (mainAudioRef.current) {
      mainAudioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
        mainAudioRef.current.src = '';
        mainAudioRef.current = null;
      }
    };
  }, []);

  // Get currently active segment and its text
  const getActiveSegment = () => {
    for (const layer of trackLayers) {
      for (const segment of layer.segments) {
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
          return segment;
        }
      }
    }
    return null;
  };

  // Play/pause functionality
  const togglePlayback = () => {
    if (!mainAudioRef.current || !audioLoaded) {
      toast.error('Audio not loaded yet');
      return;
    }

    if (isPlaying) {
      stopPlaying();
    } else {
      startPlaying();
    }
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    if (mainAudioRef.current) {
      mainAudioRef.current.pause();
    }
  };

  const startPlaying = () => {
    if (!mainAudioRef.current || !audioLoaded) return;

    setIsPlaying(true);
    // Sync audio currentTime with timeline currentTime
    mainAudioRef.current.currentTime = currentTime / 1000;
    mainAudioRef.current.play().catch(e => {
      console.error('Failed to play audio:', e);
      setIsPlaying(false);
      toast.error('Failed to play audio');
    });
  };

  // Handle timeline click
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = pixelsToTime(x);

    if (newTime >= 0 && newTime <= duration) {
      setCurrentTime(newTime);

      // Seek audio to new position
      if (mainAudioRef.current && audioLoaded) {
        mainAudioRef.current.currentTime = newTime / 1000;
      }
    }
  };

  // Handle segment click to jump to segment start
  const handleSegmentClick = (segment, e) => {
    e.stopPropagation(); // Prevent timeline click event

    const segmentStartTime = segment.startTime;
    setCurrentTime(segmentStartTime);

    // Seek audio to segment start
    if (mainAudioRef.current && audioLoaded) {
      mainAudioRef.current.currentTime = segmentStartTime / 1000;
    }

    setActiveTranscriptLine(segment?.transcript_line)
  };

  // Generate timeline markers
  // Generate timeline markers with dynamic intervals based on duration and zoom
  const generateMarkers = () => {
    const markers = [];

    // Calculate appropriate interval based on duration and zoom
    const getMarkerInterval = () => {
      const totalWidth = 800 * zoom;
      const durationMinutes = duration / 60000;

      // Base intervals in milliseconds
      const intervals = [
        100,    // 0.1 seconds
        250,    // 0.25 seconds
        500,    // 0.5 seconds
        1000,   // 1 second
        2500,   // 2.5 seconds
        5000,   // 5 seconds
        10000,  // 10 seconds
        15000,  // 15 seconds
        30000,  // 30 seconds
        60000,  // 1 minute
        120000, // 2 minutes
        300000, // 5 minutes
        600000, // 10 minutes
        900000, // 15 minutes
        1800000 // 30 minutes
      ];

      // Target: approximately one marker every 80-120 pixels
      const targetPixelsPerMarker = 100;
      const pixelsPerMs = totalWidth / duration;
      const targetInterval = targetPixelsPerMarker / pixelsPerMs;

      // Find the best interval
      let bestInterval = intervals[0];
      for (const interval of intervals) {
        if (interval >= targetInterval) {
          bestInterval = interval;
          break;
        }
        bestInterval = interval;
      }

      return bestInterval;
    };

    const interval = getMarkerInterval();

    // Generate major markers
    for (let i = 0; i <= duration; i += interval) {
      const leftPosition = timeToPixels(i);

      markers.push(
        <div
          key={`major-${i}`}
          className="absolute top-0 h-4 w-px bg-border z-10"
          style={{ left: `${leftPosition}px` }}
        />
      );

      markers.push(
        <div
          key={`label-${i}`}
          className="absolute top-5 text-[10px] text-muted-foreground font-mono whitespace-nowrap select-none"
          style={{
            left: `${leftPosition}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {formatTime(i)}
        </div>
      );
    }

    // Generate minor markers (subdivisions) if there's enough space
    const minorInterval = interval / 4;
    if (timeToPixels(minorInterval) >= 20) { // Only show if at least 20px apart
      for (let i = minorInterval; i < duration; i += minorInterval) {
        // Skip positions that would overlap with major markers
        if (i % interval !== 0) {
          markers.push(
            <div
              key={`minor-${i}`}
              className="absolute top-1 h-2 w-px bg-border/50 z-5"
              style={{ left: `${timeToPixels(i)}px` }}
            />
          );
        }
      }
    }

    return markers;
  };

  // Update playhead position
  useEffect(() => {
    setPlayheadPosition(timeToPixels(currentTime));
  }, [currentTime, timeToPixels]);

  // Get currently active segments for highlighting
  const getActiveSegments = () => {
    const activeSegments = new Set();
    trackLayers.forEach(layer => {
      layer.segments.forEach(segment => {
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
          activeSegments.add(segment.id);
        }
      });
    });
    return activeSegments;
  };

  const activeSegments = getActiveSegments();
  const activeSegment = getActiveSegment();

  return (
    <div className="w-full rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-1 bg-accent mb-2">
        <div className="flex items-center gap-2">
          <Button
            size="icon_8"
            variant="outline"
            onClick={togglePlayback}
            disabled={!audioLoaded}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </Button>

          <Button size="icon_8" variant="outline" onClick={() => {
            setCurrentTime(0);
            if (mainAudioRef.current && audioLoaded) {
              mainAudioRef.current.currentTime = 0;
            }
            stopPlaying();
          }}>
            <Square size={16} />
          </Button>

          <Button
            size="icon_8" variant="outline"
            onClick={() => {
              const newTime = Math.max(0, currentTime - 5000);
              setCurrentTime(newTime);
              if (mainAudioRef.current && audioLoaded) {
                mainAudioRef.current.currentTime = newTime / 1000;
              }
            }}
          >
            <SkipBack size={16} />
          </Button>

          <Button
            size="icon_8" variant="outline"
            onClick={() => {
              const newTime = Math.min(duration, currentTime + 5000);
              setCurrentTime(newTime);
              if (mainAudioRef.current && audioLoaded) {
                mainAudioRef.current.currentTime = newTime / 1000;
              }
            }}
          >
            <SkipForward size={16} />
          </Button>

          <Input
            className="text-sm font-mono bg-muted px-2 py-0.5 rounded w-24"
            value={formatTime(currentTime)}
            readOnly
          />
          <span>/</span>
          <Input
            className="text-sm font-mono bg-muted px-2 py-0.5 rounded w-24" readOnly
            value={formatTime(duration)}
          />

          {/* Audio status indicator */}
          <div className="flex items-center gap-2">
            {audioError && (
              <span className="text-xs text-red-500">Audio Error</span>
            )}
            {!audioLoaded && !audioError && (
              <span className="text-xs text-yellow-500">Loading Audio...</span>
            )}
            {audioLoaded && (
              <span className="text-xs text-green-500">Audio Ready</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Volume2 size={16} className="text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground w-8">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className='flex rounded-lg bg-muted/20'>
        <div className='w-52 border bg-muted/50 p-2'>
          <div className='h-10'>
          </div>
          {trackLayers.map((layer) => (
            <div key={`audio-track-layer-${layer.id}`} className="h-10 mb-4">
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium">{layer.id}</div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                ></div>
                <span className="text-xs text-muted-foreground">
                  ({layer.segments.length} segment{layer.segments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Volume2 size={14} className="text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={layer.volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setTrackLayers(prev => prev.map(l =>
                      l.id === layer.id ? { ...l, volume: newVolume } : l
                    ));
                  }}
                  className="w-16"
                />
                <span className="text-xs text-muted-foreground w-8">{Math.round(layer.volume * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 border p-2 overflow-auto">
          {/* Timeline Header */}
          <div
            ref={timelineRef}
            className="relative h-12 cursor-pointer" // Increased height to accommodate labels
            onClick={handleTimelineClick}
            style={{
              width: `${Math.max(800 * zoom, 1000)}px`, // Minimum width of 1000px
              minWidth: '100%' // Ensure it fills the container
            }}
          >
            {generateMarkers()}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none"
              style={{ left: `${playheadPosition}px` }}
            >
              {/* Playhead indicator triangle */}
              <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500"></div>
            </div>
          </div>

          {/* Track Layers */}
          <div className="space-y-4">
            {trackLayers.map((layer) => (
              <div key={layer.id} className="relative">
                {/* Layer Timeline */}
                <div
                  className="relative h-10 bg-muted/30 rounded-md border"
                  style={{ width: `${800 * zoom}px` }}
                >
                  {/* Audio Segments */}
                  {layer.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className={`absolute top-0.5 bottom-0.5 rounded-sm border cursor-pointer hover:opacity-90 ${
                        activeSegments.has(segment.id) ? 'ring-2 ring-green-500 shadow-lg' : 'hover:ring-1 hover:ring-ring/50'
                      }`}
                      style={{
                        left: `${timeToPixels(segment.startTime)}px`,
                        width: `${timeToPixels(segment.endTime - segment.startTime)}px`,
                        backgroundColor: layer.color,
                        opacity: activeSegments.has(segment.id) ? 1 : 0.7
                      }}
                      onClick={(e) => handleSegmentClick(segment, e)}
                      title={`Click to jump to: ${segment.name} - ${segment.value}`}
                    >
                      {/* Segment Content */}
                      <div className="absolute left-1 right-1 top-0 bottom-0 pointer-events-none">
                        {/* Segment Label */}
                        <div className="absolute top-0 left-1 text-xs text-white/80 truncate max-w-full">
                          {segment.name}
                        </div>

                        {/* Active indicator */}
                        {activeSegments.has(segment.id) && (
                          <div className="absolute top-0 right-1 text-xs text-white animate-pulse">
                            ▶
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Segment Display */}
      <div className='w-full border flex'>
        <div className='flex-none w-52 border bg-muted/50 p-2'>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Time:</span>
            {activeSegment && <span className="font-mono text-xs">{formatTime(activeSegment.startTime)} - {formatTime(activeSegment.endTime)}</span>}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Duration:</span>
            {activeSegment && <span className="font-mono text-xs">{formatTime(activeSegment.endTime - activeSegment.startTime)}</span>}
          </div>
        </div>
        <div className="flex gap-0.5 w-full p-2">
          <div className="flex items-center text-sm">
            {activeSegment?.speaker?.includes("SPEAKER") && activeSegment?.speaker + ": "}
            {activeSegment?.value}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
        <div></div>
        <div className="flex items-center space-x-4">
          <span>Duration: {formatTime(duration)}</span>
          <span>Zoom: {zoom}x</span>
          <span>Precision: 1ms</span>
          <span>Audio: {audioLoaded ? 'Ready' : 'Loading...'}</span>
        </div>
      </div>
    </div>
  );
};

export default TranscriptTimeline;