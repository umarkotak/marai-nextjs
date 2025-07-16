import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Clock, Music } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'react-toastify';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

var SHOWN_TRACKS_NAME = ["translated"] // translated, original, instrument

var varCurrentActiveSegment = {}

const SubtitleTimeline = ({
  playerState,
  playerRef,
  setPlayerState,
  taskDetail,
  subtitleInfo,
  activeLine,
  setActiveLine,
  setSubtitleInfo,
}) => {
  async function GetSubtitleInfo(tempSubtitleInfo) {
    try {
      if (!tempSubtitleInfo.duration_ms) { return }

      setDuration(tempSubtitleInfo.duration_ms)

      var tmpTrackLayers = []

      if (!tempSubtitleInfo.original_transcript?.id) { return }
      if (!tempSubtitleInfo.translated_transcripts?.id) { return }

      tmpTrackLayers.push({
        id: tempSubtitleInfo.translated_transcripts?.id,
        name: tempSubtitleInfo.translated_transcripts?.speaker,
        color: 'hsl(217 91% 60%)', // modern blue
        volume: 1,
        segments: tempSubtitleInfo.translated_transcripts?.transcript_lines.map((segment) => ({
          id: segment?.id,
          startTime: segment.start_at_ms,
          endTime: segment.end_at_ms,
          name: segment?.speaker,
          value: segment.value,
        }))
      })

      setTrackLayers(tmpTrackLayers)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    GetSubtitleInfo(subtitleInfo)
  }, [taskDetail, subtitleInfo])

  useEffect(() => {
    if (activeLine.start_at_ms) {
      setCurrentTime(activeLine.start_at_ms)
      playerRef.current?.seekTo(activeLine.start_at_ms/1000, 'seconds');
    }
  }, [activeLine])

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60000); // 60 seconds in ms
  const [zoom, setZoom] = useState(10);
  const [trackLayers, setTrackLayers] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  const timelineRef = useRef(null);
  const animationRef = useRef(null);
  const lastUpdateTimeRef = useRef(0); // Track when we last updated time

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

  // Seek to a specific time (used by all seek operations)
  const seekTo = useCallback((newTime) => {
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clampedTime);
    playerRef.current?.seekTo(clampedTime / 1000, 'seconds');

    // If currently playing, restart the animation loop from the new time
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startAnimationLoop(clampedTime);
    }
  }, [duration, isPlaying, playerRef]);

  // Start animation loop from a specific time
  const startAnimationLoop = useCallback((startTime) => {
    const animationStartTime = Date.now();
    lastUpdateTimeRef.current = animationStartTime;

    const updateTime = () => {
      const now = Date.now();
      const elapsed = now - animationStartTime;
      const newTime = startTime + elapsed;

      if (newTime >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        setPlayerState(prev => ({ ...prev, playing: false }));
        return;
      }

      setCurrentTime(newTime);
      lastUpdateTimeRef.current = now;
      animationRef.current = requestAnimationFrame(updateTime);
    };

    updateTime();
  }, [duration, setPlayerState]);

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
    setPlayerState(prev => ({
      ...prev,
      playing: false
    }));
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }

  const startPlaying = () => {
    setIsPlaying(true);
    setPlayerState(prev => ({
      ...prev,
      playing: true
    }));
    startAnimationLoop(currentTime);
  }

  // Handle timeline click
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = pixelsToTime(x);
    seekTo(newTime);
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
    seekTo(startTime);

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
              segments: layer.segments.map(s => {
                if (s.id === segmentId) {
                  sycnSegmentToSubtitleInfo(s)
                }
                return s.id === segmentId
                  ? { ...s, startTime: newStartTime, endTime: newEndTime }
                  : s
              })
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
              segments: layer.segments.map(s => {
                if (s.id === segmentId) {
                  sycnSegmentToSubtitleInfo(s)
                }
                return s.id === segmentId
                  ? { ...s, startTime: newStartTime }
                  : s
              })
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
              segments: layer.segments.map(s => {
                if (s.id === segmentId) {
                  sycnSegmentToSubtitleInfo(s)
                }
                return s.id === segmentId
                  ? { ...s, endTime: newEndTime }
                  : s
              })
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
          className="absolute top-0 h-5 w-px bg-border/80 z-10"
          style={{ left: `${leftPosition}px` }}
        />
      );

      markers.push(
        <div
          key={`label-${i}`}
          className="absolute top-6 text-[10px] text-muted-foreground font-mono whitespace-nowrap select-none"
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
              className="absolute top-1 h-3 w-px bg-border/40 z-5"
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

  const getActiveSegment = () => {
    for (const layer of trackLayers) {
      if (layer.name !== "translated") { continue }
      for (const segment of layer.segments) {
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
          if (varCurrentActiveSegment?.id !== segment.id) {
            varCurrentActiveSegment = segment
            setActiveLine(segment)
          }

          return segment;
        }
      }
    }
    return null;
  };

  const activeSegment = getActiveSegment();

  function sycnSegmentToSubtitleInfo(seg) {
    let segmentIDSplit = seg.id.split("-")
    let index = segmentIDSplit[1]

    setSubtitleInfo(prevInfo => {
      const updatedInfo = { ...prevInfo };
      if (updatedInfo.translated_transcripts?.transcript_lines[index]) {
        updatedInfo.translated_transcripts.transcript_lines[index] = {
          ...updatedInfo.translated_transcripts.transcript_lines[index],
          start_at_ms: seg.startTime,
          end_at_ms: seg.endTime,
        };
      }
      return updatedInfo;
    });
  }

  useEffect(() => {
    // console.log("TRS", trackLayers)
  }, [trackLayers])

  return (
    <div className="w-full rounded-lg border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-muted/50 to-muted/30 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={togglePlayback} className="h-8 w-8">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>

            <Button size="sm" variant="outline" onClick={() => {
              seekTo(0);
              stopPlaying();
            }} className="h-8 w-8">
              <Square size={14} />
            </Button>

            <Button
              size="sm" variant="outline"
              onClick={() => seekTo(currentTime - 5000)}
              className="h-8 w-8"
            >
              <SkipBack size={14} />
            </Button>

            <Button
              size="sm" variant="outline"
              onClick={() => seekTo(currentTime + 5000)}
              className="h-8 w-8"
            >
              <SkipForward size={14} />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-muted-foreground" />
              <Input
                className="text-sm font-mono bg-background px-2 py-1 h-8 w-28 text-center"
                value={formatTime(currentTime)}
                onChange={() => {}}
                readOnly
              />
            </div>
            <span className="text-muted-foreground">/</span>
            <Input
              className="text-sm font-mono bg-background px-2 py-1 h-8 w-28 text-center"
              value={formatTime(duration)}
              readOnly
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-center">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className='flex'>
        {/* Track Controls */}
        <div className='w-56 border-r bg-muted/20'>
          <div className='h-10 px-3 py-2 border-b bg-muted/30'>
            <div className='flex gap-2'>
            </div>
          </div>

          {trackLayers.filter((layer) => SHOWN_TRACKS_NAME.includes(layer.name)).map((layer, index) => (
            <div key={`audio-track-layer-${layer.id}`} className="h-12 border-b px-3 py-2 bg-background/50">
              <div className="flex items-center gap-2 h-full">
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="flex-1 min-w-0">
                  {/* <div className="text-sm font-medium truncate">{layer.name}</div> */}
                  <div className="text-sm font-medium truncate">subtitle</div>
                  <div className="text-xs text-muted-foreground">
                    {layer.segments.length} segment{layer.segments.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto bg-background">
          {/* Timeline Header */}
          <div
            ref={timelineRef}
            className="relative h-10 cursor-pointer border-b bg-muted/10 hover:bg-muted/20 transition-colors"
            onClick={handleTimelineClick}
            style={{
              width: `${Math.max(800 * zoom, 1000)}px`,
              minWidth: '100%'
            }}
          >
            {generateMarkers()}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none"
              style={{ left: `${playheadPosition}px` }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
            </div>
          </div>

          {/* Track Layers */}
          <div className="relative">
            {trackLayers.filter((layer) => SHOWN_TRACKS_NAME.includes(layer.name)).map((layer, index) => (
              <div key={layer.id} className="relative">
                <div
                  className="relative h-12 bg-background border-b hover:bg-muted/10 transition-colors"
                  style={{ width: `${Math.max(800 * zoom, 1000)}px` }}
                >
                  {/* Playhead line for each track */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-20 pointer-events-none"
                    style={{ left: `${playheadPosition}px` }}
                  />

                  {/* Audio Segments */}
                  {layer.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className={`absolute top-1 bottom-1 rounded-md group border-2 transition-all cursor-move ${
                        activeSegment?.id === segment.id
                          ? 'ring-2 ring-primary ring-offset-1 border-primary shadow-md'
                          : 'border-transparent hover:border-primary/50 hover:shadow-sm'
                      }`}
                      style={{
                        left: `${timeToPixels(segment.startTime)}px`,
                        width: `${Math.max(timeToPixels(segment.endTime - segment.startTime), 40)}px`,
                        backgroundColor: layer.color,
                        opacity: activeSegment?.id === segment.id ? 0.9 : 0.8
                      }}
                    >
                      {/* Left Resize Handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/0 hover:bg-white/30 transition-colors"
                        onMouseDown={(e) => handleLeftResizeMouseDown(segment.id, e)}
                        title="Resize left edge"
                      >
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Segment Content */}
                      <div
                        className="absolute left-2 right-2 top-0 bottom-0 cursor-move flex items-center"
                        onMouseDown={(e) => handleSegmentMouseDown(segment.id, e)}
                      >
                        <div className="text-xs text-white/90 truncate font-medium">
                          {segment.value}
                        </div>
                      </div>

                      {/* Right Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/0 hover:bg-white/30 transition-colors"
                        onMouseDown={(e) => handleRightResizeMouseDown(segment.id, e)}
                        title="Resize right edge"
                      >
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Segment Editor */}
      <div className='border-t bg-muted/10'>
        <div className='flex'>
          <div className='w-56 border-r bg-muted/20 px-3 py-2'>
            <div className="flex flex-col gap-1">
              {/* <div className="flex items-center gap-2">
                <Music size={14} className="text-muted-foreground" />
                <span className="font-medium text-sm truncate">{activeSegment?.name}</span>
              </div> */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Time:</span>
                <span className="font-mono">{formatTime(activeSegment?.startTime)} - {formatTime(activeSegment?.endTime)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Duration:</span>
                <span className="font-mono">{formatTime(activeSegment?.endTime - activeSegment?.startTime)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <Textarea
              value={activeSegment?.value}
              className="resize-none"
              onChange={() => {}}
              placeholder="Edit subtitle text..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtitleTimeline;