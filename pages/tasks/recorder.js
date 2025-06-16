import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Play, Pause, Download, FileText, Loader2, XCircle, Eye, EyeOff, Info } from 'lucide-react';

export default function RecordingApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [wakeLockStatus, setWakeLockStatus] = useState('not-active');
  const [fileSize, setFileSize] = useState(0);
  const [audioQuality, setAudioQuality] = useState('medium'); // low, medium, high

  // Set default values for source language and speaker number
  const [sourceLanguage, setSourceLanguage] = useState('id');
  const [speakerNumber, setSpeakerNumber] = useState('0');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  // Audio quality presets for WAV
  const getAudioConstraints = () => {
    const presets = {
      low: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
        channelCount: 1
      },
      medium: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 22050,
        channelCount: 1
      },
      high: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 2
      }
    };
    return presets[audioQuality];
  };

  // Waveform visualization
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    const analyser = analyserRef.current;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;

      analyser.getByteTimeDomainData(dataArray);

      canvasContext.fillStyle = 'rgb(30, 30, 30)';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = 'rgb(59, 130, 246)'; // Blue color
      canvasContext.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasContext.lineTo(canvas.width, canvas.height / 2);
      canvasContext.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [isRecording]);

  // Screen Wake Lock functionality
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockStatus('active');

        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockStatus('released');
        });

        console.log('Screen wake lock acquired');
      } else {
        setWakeLockStatus('not-supported');
        console.warn('Wake Lock API not supported');
      }
    } catch (err) {
      setWakeLockStatus('failed');
      console.error('Failed to acquire wake lock:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockStatus('released');
        console.log('Screen wake lock released');
      }
    } catch (err) {
      console.error('Failed to release wake lock:', err);
    }
  }, []);

  // Handle visibility change to re-acquire wake lock
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRecording && wakeLockStatus === 'released') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, wakeLockStatus, requestWakeLock]);

  // Clean up wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError('');
      setFileSize(0);

      // Request wake lock before starting recording
      await requestWakeLock();

      const constraints = getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      streamRef.current = stream;

      // Set up audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.85;
      analyserRef.current.fftSize = 2048;

      // Use WebM for recording but we'll convert to WAV later
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType && { mimeType })
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(blob);
        setFileSize(blob.size);
        stream.getTracks().forEach(track => track.stop());
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start waveform visualization
      drawWaveform();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      console.error(err);
      await releaseWakeLock();
    }
  }, [requestWakeLock, releaseWakeLock, audioQuality, drawWaveform]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Release wake lock when recording stops
      await releaseWakeLock();
    }
  }, [isRecording, releaseWakeLock]);

  const playRecording = useCallback(() => {
    if (recordedBlob && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        const audioUrl = URL.createObjectURL(recordedBlob);
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
        setIsPlaying(true);

        audioPlayerRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    }
  }, [recordedBlob, isPlaying]);

  // Optimized WAV conversion with configurable quality
  const audioBufferToWav = (buffer, targetSampleRate = null, targetChannels = null) => {
    const originalSampleRate = buffer.sampleRate;
    const originalChannels = buffer.numberOfChannels;
    
    // Use specified sample rate and channels, or defaults based on quality
    const finalSampleRate = targetSampleRate || (audioQuality === 'low' ? 16000 : 
                                          audioQuality === 'medium' ? 22050 : 44100);
    const finalChannels = targetChannels || (audioQuality === 'high' ? Math.min(2, originalChannels) : 1);
    
    // Calculate downsample ratio
    const downsampleRatio = originalSampleRate / finalSampleRate;
    const length = Math.floor(buffer.length / downsampleRatio);
    
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = finalChannels * bytesPerSample;
    const byteRate = finalSampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, finalChannels, true);
    view.setUint32(24, finalSampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert and downsample audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sourceIndex = Math.floor(i * downsampleRatio);
      for (let channel = 0; channel < finalChannels; channel++) {
        let sample;
        if (channel < originalChannels) {
          sample = buffer.getChannelData(channel)[sourceIndex] || 0;
        } else {
          // If we need stereo but only have mono, duplicate the channel
          sample = buffer.getChannelData(0)[sourceIndex] || 0;
        }
        
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const downloadRecording = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      // Always convert to optimized WAV
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBuffer = audioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

      // Update file size display with WAV size
      setFileSize(wavBlob.size);

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to download recording.');
      console.error(err);
    }
  }, [recordedBlob, audioQuality]);

  const transcribeRecording = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      setIsTranscribing(true);
      setError('');

      // Convert to WAV for transcription
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBuffer = audioBufferToWav(audioBuffer);
      const finalBlob = new Blob([wavBuffer], { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('task_name', `recording-${new Date().toISOString()}`);
      formData.append('audio_file', finalBlob, `recording-${new Date().toISOString()}.wav`);
      formData.append('source_language', sourceLanguage);
      formData.append('speaker_number', speakerNumber);

      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Transcription completed (simulated)');

    } catch (err) {
      setError(`Failed to transcribe recording: ${err.message}`);
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  }, [recordedBlob, sourceLanguage, speakerNumber, audioQuality]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getWakeLockStatusColor = () => {
    switch (wakeLockStatus) {
      case 'active': return 'text-green-600';
      case 'released': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'not-supported': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  const getWakeLockStatusText = () => {
    switch (wakeLockStatus) {
      case 'active': return 'Screen stay-awake: Active';
      case 'released': return 'Screen stay-awake: Released';
      case 'failed': return 'Screen stay-awake: Failed';
      case 'not-supported': return 'Screen stay-awake: Not supported';
      default: return 'Screen stay-awake: Inactive';
    }
  };

  const getQualityDescription = () => {
    const descriptions = {
      low: 'Low (16kHz, Mono) - Smallest files, good for speech',
      medium: 'Medium (22kHz, Mono) - Balanced quality and size',
      high: 'High (44kHz, Stereo) - Best quality, larger files'
    };
    return descriptions[audioQuality];
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              Audio Recorder
            </CardTitle>
            <CardDescription className="text-lg">
              Record, play, download WAV files, and transcribe your audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Wake Lock Status Indicator */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              {wakeLockStatus === 'active' ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
              <span className={getWakeLockStatusColor()}>
                {getWakeLockStatusText()}
              </span>
            </div>

            {/* Audio Quality Settings */}
            <div className="space-y-2">
              <Label htmlFor="audio_quality">Audio Quality (WAV Output)</Label>
              <Select value={audioQuality} onValueChange={setAudioQuality} disabled={isRecording}>
                <SelectTrigger id="audio_quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Quality (Smallest files)</SelectItem>
                  <SelectItem value="medium">Medium Quality (Recommended)</SelectItem>
                  <SelectItem value="high">High Quality (Largest files)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{getQualityDescription()}</span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="px-8 py-6 text-lg font-semibold"
                >
                  {isRecording ? (
                    <><MicOff className="mr-2 h-6 w-6" />Stop Recording</>
                  ) : (
                    <><Mic className="mr-2 h-6 w-6" />Start Recording</>
                  )}
                </Button>
              </div>
              {isRecording && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    Recording: {formatTime(recordingTime)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Waveform Display */}
            {isRecording && (
              <div className="space-y-2">
                <Label>Live Waveform</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={150}
                    className="w-full h-24 border rounded bg-gray-900"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Transcription Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="source_language">Source Language</Label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger id="source_language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Indonesia (id)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="speaker_number">Number of Speakers</Label>
                <Input
                  id="speaker_number"
                  type="number"
                  placeholder="e.g., 2"
                  value={speakerNumber}
                  onChange={(e) => setSpeakerNumber(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {recordedBlob && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">
                      Recording Ready
                    </h3>
                    {/* File Size Display */}
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                      <Badge variant="outline" className="px-3 py-1">
                        WAV Size: {formatFileSize(fileSize)}
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        Duration: {formatTime(recordingTime)}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={playRecording}
                      variant="outline"
                      className="flex items-center justify-center space-x-2 py-6"
                    >
                      {isPlaying ? (
                        <><Pause className="h-5 w-5" /><span>Pause</span></>
                      ) : (
                        <><Play className="h-5 w-5" /><span>Play</span></>
                      )}
                    </Button>
                    <Button
                      onClick={downloadRecording}
                      variant="outline"
                      className="flex items-center justify-center space-x-2 py-6"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download WAV</span>
                    </Button>
                    <Button
                      onClick={transcribeRecording}
                      variant="outline"
                      disabled={isTranscribing}
                      className="flex items-center justify-center space-x-2 py-6"
                    >
                      {isTranscribing ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /><span>Transcribing...</span></>
                      ) : (
                        <><FileText className="h-5 w-5" /><span>Transcribe</span></>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <audio ref={audioPlayerRef} style={{ display: 'none' }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}