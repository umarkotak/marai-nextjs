import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { Mic, MicOff, Play, Pause, Download, FileText, Loader2, XCircle } from 'lucide-react';
import maraiAPI from '@/apis/maraiAPI';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

export default function RecordingApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  
  // Set default values for source language and speaker number
  const [sourceLanguage, setSourceLanguage] = useState('id'); 
  const [speakerNumber, setSpeakerNumber] = useState('0'); 

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const timerRef = useRef(null);
  const router = useRouter();

  const startRecording = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

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
  
  // Utility function to convert audio buffer to WAV
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
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
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const downloadRecording = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBuffer = audioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

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
  }, [recordedBlob]);

  const transcribeRecording = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      setIsTranscribing(true);
      setError('');

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBuffer = audioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('task_name', `recording-${new Date().toISOString()}`);
      formData.append('audio_file', wavBlob, `recording-${new Date().toISOString()}.wav`);
      formData.append('task_type', 'basic_transcript');

      // Append source language and speaker number from state
      formData.append('source_language', sourceLanguage);
      formData.append('speaker_number', speakerNumber);

      const response = await maraiAPI.postCreateTranscriptingTask({
        "Content-Type": "multipart/form-data"
      }, formData);

      if (response.ok) {
        toast.success("Transcription started! Redirecting to tasks list...");
        router.push('/tasks'); // Redirect to /tasks page
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

    } catch (err) {
      setError(`Failed to transcribe recording: ${err.message}`);
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  }, [recordedBlob, sourceLanguage, speakerNumber, router]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">Audio Recorder</CardTitle>
            <CardDescription className="text-lg">
              Record, play, download, and transcribe your audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

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

            {/* Transcription Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
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
              <div>
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
                  <h3 className="text-xl font-semibold text-center text-gray-700">
                    Recording Ready
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={playRecording} variant="outline" className="flex items-center justify-center space-x-2 py-6">
                      {isPlaying ? <><Pause className="h-5 w-5" /><span>Pause</span></> : <><Play className="h-5 w-5" /><span>Play</span></>}
                    </Button>
                    <Button onClick={downloadRecording} variant="outline" className="flex items-center justify-center space-x-2 py-6">
                      <Download className="h-5 w-5" /><span>Download WAV</span>
                    </Button>
                    <Button onClick={transcribeRecording} variant="outline" disabled={isTranscribing} className="flex items-center justify-center space-x-2 py-6">
                      {isTranscribing ? <><Loader2 className="h-5 w-5 animate-spin" /><span>Transcribing...</span></> : <><FileText className="h-5 w-5" /><span>Transcribe</span></>}
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