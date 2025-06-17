import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Scissors, Move, Clock, Music, Plus } from 'lucide-react';
import { Button } from './ui/button';
import maraiAPI from '@/apis/maraiAPI';
import { toast } from 'react-toastify';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

var SHOWN_TRACKS_NAME = ["translated"] // translated, original, instrument

const MovieTimeline = ({
  playerState,
  playerRef,
  setPlayerState,
  taskDetail,
  dubbingInfo,
}) => {
  // Audio references for each segment
  const audioRefs = useRef(new Map());
  const currentlyPlayingAudios = useRef(new Set());
  const [activeAudio, setActiveAudio] = useState("translated")

  async function GetDubbingInfo(tempDubbingInfo) {
    try {
      if (!tempDubbingInfo.duration_ms) { return }

      setDuration(tempDubbingInfo.duration_ms)

      var tmpTrackLayers = []

      if (!tempDubbingInfo.original_transcript?.id) { return }
      if (!tempDubbingInfo.translated_transcripts?.id) { return }

      tmpTrackLayers.push({
        id: "instrument",
        name: "instrument",
        color: 'hsl(0 72.2% 50.6%)', // red-500
        volume: 1,
        segments: [
          {
            id: "instrument",
            startTime: 0,
            endTime: tempDubbingInfo?.duration_ms,
            waveform: generateWaveform(150),
            name: "instrument",
            value: "",
            audioUrl: tempDubbingInfo?.audio_instrument_url,
          }
        ]
      })

      tmpTrackLayers.push({
        id: tempDubbingInfo.translated_transcripts?.id,
        name: tempDubbingInfo.translated_transcripts?.speaker,
        color: 'hsl(0 72.2% 50.6%)', // red-500
        volume: 1,
        segments: tempDubbingInfo.translated_transcripts?.transcript_lines.map((segment) => ({
          id: segment?.id,
          startTime: segment.start_at_ms,
          endTime: segment.end_at_ms,
          waveform: generateWaveform(150),
          name: segment?.speaker,
          value: segment.value,
          audioUrl: segment?.audio_url || segment?.wav_url, // Add audio URL
        }))
      })

      tmpTrackLayers.push({
        id: tempDubbingInfo.original_transcript?.id,
        name: tempDubbingInfo.original_transcript?.speaker,
        color: 'hsl(221.2 83.2% 53.3%)', // blue-600
        volume: 0,
        segments: tempDubbingInfo.original_transcript?.transcript_lines.map((segment) => ({
          id: segment?.id,
          startTime: segment.start_at_ms,
          endTime: segment.end_at_ms,
          waveform: generateWaveform(150),
          name: segment?.speaker,
          value: segment.value,
          audioUrl: segment?.audio_url || segment?.wav_url, // Add audio URL
        }))
      })

      setTrackLayers(tmpTrackLayers)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    GetDubbingInfo(dubbingInfo)
  }, [taskDetail, dubbingInfo])

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60000); // 60 seconds in ms
  const [volume, setVolume] = useState(0.8);
  const [zoom, setZoom] = useState(2);
  const [trackLayers, setTrackLayers] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  const timelineRef = useRef(null);
  const animationRef = useRef(null);

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

  // Preload audio elements
  const preloadAudio = useCallback((segment, layerVolume) => {
    if (!segment.audioUrl || audioRefs.current.has(segment.id)) return;

    const audio = new Audio();
    audio.src = segment.audioUrl;
    audio.preload = 'auto';
    audio.volume = layerVolume * volume;

    // Handle loading events
    audio.addEventListener('loadeddata', () => {
      console.log(`Audio loaded for segment ${segment.id}`);
    });

    audio.addEventListener('error', (e) => {
      console.error(`Failed to load audio for segment ${segment.id}:`, e);
    });

    audioRefs.current.set(segment.id, audio);
  }, [volume]);

  // Check which segments should be playing at current time and play/stop accordingly
  const updateAudioPlayback = useCallback(() => {
    if (!isPlaying) {
      // Stop all playing audios when timeline is paused
      currentlyPlayingAudios.current.forEach(segmentId => {
        const audio = audioRefs.current.get(segmentId);
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      currentlyPlayingAudios.current.clear();
      return;
    }

    const activeSegments = new Set();

    // Find all segments that should be playing at current time
    trackLayers.forEach(layer => {
      layer.segments.forEach(segment => {
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
          activeSegments.add(segment.id);

          // Preload audio if not already loaded
          preloadAudio(segment, layer.volume);

          const audio = audioRefs.current.get(segment.id);
          if (audio) {
            // Update volume based on layer volume and master volume
            audio.volume = layer.volume * volume;

            // If audio is not currently playing, start it
            if (!currentlyPlayingAudios.current.has(segment.id)) {
              const segmentElapsedTime = (currentTime - segment.startTime) / 1000;
              audio.currentTime = Math.max(0, segmentElapsedTime);

              audio.play().catch(e => {
                console.error(`Failed to play audio for segment ${segment.id}:`, e);
              });

              currentlyPlayingAudios.current.add(segment.id);
            }
          }
        }
      });
    });

    // Stop audios that should no longer be playing
    currentlyPlayingAudios.current.forEach(segmentId => {
      if (!activeSegments.has(segmentId)) {
        const audio = audioRefs.current.get(segmentId);
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        currentlyPlayingAudios.current.delete(segmentId);
      }
    });
  }, [currentTime, isPlaying, trackLayers, volume, preloadAudio]);

  // Update audio playback when currentTime or isPlaying changes
  useEffect(() => {
    updateAudioPlayback();
  }, [updateAudioPlayback]);

  // Update audio volumes when master volume or layer volumes change
  useEffect(() => {
    trackLayers.forEach(layer => {
      layer.segments.forEach(segment => {
        const audio = audioRefs.current.get(segment.id);
        if (audio) {
          audio.volume = layer.volume * volume;
        }
      });
    });
  }, [volume, trackLayers]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      currentlyPlayingAudios.current.clear();
    };
  }, []);

  // Get selected segment info
  const getSelectedSegmentInfo = () => {
    if (!selectedSegment) return null;

    for (const layer of trackLayers) {
      const segment = layer.segments.find(s => s.id === selectedSegment);
      if (segment) {
        return {
          ...segment,
          layerName: layer.name,
          layerColor: layer.color,
          layerVolume: layer.volume,
          duration: segment.endTime - segment.startTime
        };
      }
    }
    return null;
  };

  // Play/pause functionality
  const togglePlayback = () => {
    if (isPlaying) {
      stopPlaying()
    } else {
      startPlaying()
    }
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    setPlayerState({
      ...playerState,
      playing: false
    })
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }

  const startPlaying = () => {
    setIsPlaying(true);
    setPlayerState({
      ...playerState,
      playing: true
    })
    const startTime = Date.now() - currentTime;

    const updateTime = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      animationRef.current = requestAnimationFrame(updateTime);
    };
    updateTime();
  }

  // Handle timeline click
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = pixelsToTime(x);

    if (newTime >= 0 && newTime <= duration) {
      // Stop all currently playing audios before seeking
      currentlyPlayingAudios.current.forEach(segmentId => {
        const audio = audioRefs.current.get(segmentId);
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      currentlyPlayingAudios.current.clear();

      setCurrentTime(newTime);
      playerRef.current?.seekTo(newTime/1000);
    }
  };

  // Handle segment drag (move entire segment)
  const handleSegmentMouseDown = (segmentId, e) => {
    e.stopPropagation();
    setSelectedSegment(segmentId);
    setIsDragging(true);

    const startX = e.clientX;
    let segment = null;
    let layerId = null;

    for (const layer of trackLayers) {
      const foundSegment = layer.segments.find(s => s.id === segmentId);
      if (foundSegment) {
        segment = foundSegment;
        layerId = layer.id;
        break;
      }
    }

    if (!segment) return;

    const startTime = segment.startTime;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaTime = pixelsToTime(deltaX);
      const newStartTime = Math.max(0, startTime + deltaTime);
      const segmentDuration = segment.endTime - segment.startTime;
      const newEndTime = Math.min(duration, newStartTime + segmentDuration);

      setTrackLayers(prev => prev.map(layer =>
        layer.id === layerId
          ? {
              ...layer,
              segments: layer.segments.map(s =>
                s.id === segmentId
                  ? { ...s, startTime: newStartTime, endTime: newEndTime }
                  : s
              )
            }
          : layer
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle segment resize (left edge)
  const handleLeftResizeMouseDown = (segmentId, e) => {
    e.stopPropagation();
    setSelectedSegment(segmentId);
    setIsDragging(true);

    const startX = e.clientX;
    let segment = null;
    let layerId = null;

    for (const layer of trackLayers) {
      const foundSegment = layer.segments.find(s => s.id === segmentId);
      if (foundSegment) {
        segment = foundSegment;
        layerId = layer.id;
        break;
      }
    }

    if (!segment) return;

    const originalStartTime = segment.startTime;
    const originalEndTime = segment.endTime;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaTime = pixelsToTime(deltaX);
      const newStartTime = Math.max(0, Math.min(originalStartTime + deltaTime, originalEndTime - 1000));

      setTrackLayers(prev => prev.map(layer =>
        layer.id === layerId
          ? {
              ...layer,
              segments: layer.segments.map(s =>
                s.id === segmentId
                  ? { ...s, startTime: newStartTime }
                  : s
              )
            }
          : layer
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle segment resize (right edge)
  const handleRightResizeMouseDown = (segmentId, e) => {
    e.stopPropagation();
    setSelectedSegment(segmentId);
    setIsDragging(true);

    const startX = e.clientX;
    let segment = null;
    let layerId = null;

    for (const layer of trackLayers) {
      const foundSegment = layer.segments.find(s => s.id === segmentId);
      if (foundSegment) {
        segment = foundSegment;
        layerId = layer.id;
        break;
      }
    }

    if (!segment) return;

    const originalStartTime = segment.startTime;
    const originalEndTime = segment.endTime;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaTime = pixelsToTime(deltaX);
      const newEndTime = Math.min(duration, Math.max(originalEndTime + deltaTime, originalStartTime + 1000));

      setTrackLayers(prev => prev.map(layer =>
        layer.id === layerId
          ? {
              ...layer,
              segments: layer.segments.map(s =>
                s.id === segmentId
                  ? { ...s, endTime: newEndTime }
                  : s
              )
            }
          : layer
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Format time display
  const formatTime = (ms) => {
    if (!ms) { return "" }

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

  const selectedSegmentInfo = getSelectedSegmentInfo();

  return (
    <div className="w-full rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-1 bg-accent">
        <div className="flex items-center gap-2">
          <Button size="icon_8" variant="outline" onClick={togglePlayback}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </Button>

          <Button size="icon_8" variant="outline" onClick={() => {
            setCurrentTime(0);
            playerRef.current?.seekTo(0);
            stopPlaying();
          }}>
            <Square size={16} />
          </Button>

          <Button
            size="icon_8" variant="outline"
            onClick={() => setCurrentTime(Math.max(0, currentTime - 5000))}
          >
            <SkipBack size={16} />
          </Button>

          <Button
            size="icon_8" variant="outline"
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 5000))}
          >
            <SkipForward size={16} />
          </Button>

          <Input
            className="text-sm font-mono bg-muted px-2 py-0.5 rounded w-32"
            value={formatTime(currentTime)}
            onChange={() => {}}
          />
          <span>/</span>
          <Input
            className="text-sm font-mono bg-muted px-2 py-0.5 rounded w-32" readOnly
            value={formatTime(duration)}
          />
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
        <div className='w-52 border bg-muted/50 py-2'>
          <div className='h-10 px-2'>
            <div className='flex gap-2'>
              <Button
                size="xs" variant={activeAudio === "translated" ? "" : "outline"}
                onClick={() => {
                  setActiveAudio("translated")
                  setTrackLayers(prev => prev.map(l => ["translated", "instrument"].includes(l.id) ? { ...l, volume: 1 } : { ...l, volume: 0 }));
                }}
              >Translated</Button>
              <Button
                size="xs" variant={activeAudio === "original" ? "" : "outline"}
                onClick={() => {
                  setActiveAudio("original")
                  setTrackLayers(prev => prev.map(l => ["original", "instrument"].includes(l.id) ? { ...l, volume: 1 } : { ...l, volume: 0 }));
                }}
              >Original</Button>
            </div>
          </div>
          {trackLayers.filter((layer) => SHOWN_TRACKS_NAME.includes(layer.name)).map((layer) => (
            <div key={`audio-track-layer-${layer.id}`} className="h-8 border-y p-2">
              <div className="flex items-center space-x-2 h-full">
                <div className="text-sm font-medium">{layer.id}</div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                ></div>
                <span className="text-xs text-muted-foreground">
                  ({layer.segments.length} segment{layer.segments.length !== 1 ? 's' : ''})
                </span>
              </div>
              {/* <div className="flex items-center space-x-2">
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
              </div> */}
            </div>
          ))}
        </div>

        <div className="flex-1 border p-2 overflow-auto">
          {/* Timeline Header */}
          <div
            ref={timelineRef}
            className="relative h-10 cursor-pointer" // Increased height to accommodate labels
            onClick={handleTimelineClick}
            style={{
              width: `${Math.max(800 * zoom, 1000)}px`, // Minimum width of 1000px
              minWidth: '100%' // Ensure it fills the container
            }}
          >
            {generateMarkers()}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none h-5"
              style={{ left: `${playheadPosition}px` }}
            >
            </div>
          </div>

          {/* Track Layers */}
          <div className="">
            {trackLayers.filter((layer) => SHOWN_TRACKS_NAME.includes(layer.name)).map((layer) => (
              <div key={layer.id} className="relative">
                {/* Layer Timeline */}
                <div
                  className="relative h-8 bg-muted/30 rounded-md border"
                  style={{ width: `${800 * zoom}px` }}
                >
                  {/* Audio Segments */}
                  {layer.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className={`absolute top-0.5 bottom-0.5 rounded-sm group border ${
                        selectedSegment === segment.id ? 'ring-2 ring-ring ring-offset-1' : 'hover:ring-1 hover:ring-ring/50'
                      } ${
                        currentlyPlayingAudios.current.has(segment.id) ? 'ring-2 ring-green-500' : ''
                      }`}
                      style={{
                        left: `${timeToPixels(segment.startTime)}px`,
                        width: `${timeToPixels(segment.endTime - segment.startTime)}px`,
                        backgroundColor: layer.color,
                        opacity: selectedSegment === segment.id ? 0.9 : 0.7
                      }}
                    >
                      {/* Left Resize Handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/0 hover:bg-white/20"
                        onMouseDown={(e) => handleLeftResizeMouseDown(segment.id, e)}
                        title="Resize left edge"
                      >
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-4 bg-white/80 rounded-full"></div>
                      </div>

                      {/* Segment Content */}
                      <div
                        className="absolute left-1 right-1 top-0 bottom-0 cursor-move"
                        onMouseDown={(e) => handleSegmentMouseDown(segment.id, e)}
                      >
                        {/* Segment Label */}
                        <div className="absolute top-0 left-1 text-xs text-white/80 truncate max-w-full line-clamp-1">
                          {segment.value}
                        </div>

                        {/* Audio indicator */}
                        {segment.audioUrl && (
                          <div className="absolute top-0 right-1 text-xs text-white/60">
                            ♪
                          </div>
                        )}
                      </div>

                      {/* Right Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/0 hover:bg-white/20"
                        onMouseDown={(e) => handleRightResizeMouseDown(segment.id, e)}
                        title="Resize right edge"
                      >
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-4 bg-white/80 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='w-full flex border'>
        <div className='flex-none w-52 border bg-muted/50 px-2 py-1'>
            <div className="flex flex-col gap-1 p-2">
              <div className="flex items-center space-x-2">
                <Music size={16} className="text-muted-foreground" />
                <span className="font-medium text-xs">{selectedSegmentInfo?.name}</span>
                <span className="text-xs text-muted-foreground">({selectedSegmentInfo?.layerName})</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Time:</span>
                <span className="font-mono text-xs">{formatTime(selectedSegmentInfo?.startTime)} - {formatTime(selectedSegmentInfo?.endTime)}</span>
              </div>
            </div>
        </div>
        {selectedSegmentInfo &&
          <div className="w-full flex flex-col items-center justify-center gap-0.5 px-2 py-1">
            <div className='flex gap-1 w-full'>
                <Textarea
                  value={selectedSegmentInfo?.value}
                  className="p-1 w-full h-8 min-h-8"
                  onChange={() => {}}
                  row="1"
                />
            </div>
            <div className='flex justify-start w-full items-center gap-4'>
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 bg-muted">
                <span>Duration:</span>
                <span>{formatTime(selectedSegmentInfo.duration)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 bg-muted">
                <span>Volume:</span>
                <span>{Math.round(selectedSegmentInfo.layerVolume * 100)}%</span>
              </div>
              {selectedSegmentInfo.audioUrl && (
                <div className="flex items-center justify-between text-sm text-muted-foreground gap-2 bg-muted">
                  <span>Audio:</span>
                  <span className="text-xs text-green-600">Available</span>
                </div>
              )}
            </div>
          </div>
        }
      </div>

      {/* Footer */}
      {/* <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
        <div></div>
        <div className="flex items-center space-x-4">
          <span>Duration: {formatTime(duration)}</span>
          <span>Zoom: {zoom}x</span>
          <span>Precision: 1ms</span>
        </div>
      </div> */}
    </div>
  );
};

export default MovieTimeline;