"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
import { useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/icon"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import maraiAPI from "@/apis/maraiAPI"

const defaultCreateParams = {
  task_type: "auto_dubbing",
  video_input: "youtube_video_url",
  task_name: "",
  youtube_video_url: "",
  voice_mode: "edge-tts",
  voice_name: "id-ID-ArdiNeural",
  voice_pitch: "-5Hz",
  voice_rate: "-5%",
  source_language: "en",
  target_language: "id",
  speaker_number: 0,
  diarize: "false"
}
export default function TaskCreate() {
  const [taskType, setTaskType] = useState("transcripting") // Enum: transcripting, dubbing

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col gap-2 w-full max-w-xl">
        <Card className="p-4">
          Create New Task
        </Card>

        <Card className="p-4">
          <div className="mb-2">
            Select Task Type
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={taskType === "transcripting" ? "" : "outline"} onClick={() => setTaskType("transcripting")}>Transcripting</Button>
            <Button size="sm" variant={taskType === "dubbing" ? "" : "outline"} onClick={() => setTaskType("dubbing")}>Dubbing</Button>
          </div>
        </Card>

        {taskType === "transcripting" &&
          <FormTranscripting />
        }

        {taskType === "dubbing" &&
          <FormDubbing />
        }
      </div>
    </div>
  )
}

function FormTranscripting() {
  const router = useRouter()
  const [inputMode, setInputMode] = useState("file")
  const [createParams, setCreateParams] = useState(defaultCreateParams)
  const [audioFile, setAudioFile] = useState(null)
  const [convertedWavFile, setConvertedWavFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const audioRef = useRef(null)

  function handleChange(name, value) {
    setCreateParams({
      ...createParams,
      [name]: value,
    })
  }

  // Convert audio file to optimized WAV format
  async function convertToWav(file) {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const fileReader = new FileReader()

      fileReader.onload = async function(e) {
        try {
          const arrayBuffer = e.target.result
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Optimize audio buffer before conversion
          const optimizedBuffer = optimizeAudioBuffer(audioBuffer, audioContext)

          // Convert to WAV with optimized settings
          const wavArrayBuffer = audioBufferToWav(optimizedBuffer)
          const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' })
          const wavFile = new File([wavBlob], file.name.replace(/\.[^/.]+$/, "") + ".wav", {
            type: 'audio/wav'
          })

          resolve(wavFile)
        } catch (error) {
          reject(error)
        }
      }

      fileReader.onerror = () => reject(new Error('Failed to read file'))
      fileReader.readAsArrayBuffer(file)
    })
  }

  // Optimize audio buffer for smaller file size
  function optimizeAudioBuffer(audioBuffer, audioContext) {
    const originalSampleRate = audioBuffer.sampleRate
    const numberOfChannels = audioBuffer.numberOfChannels

    // Target sample rate for speech (16kHz is good for transcription)
    const targetSampleRate = 16000

    // Convert to mono if stereo (speech transcription doesn't need stereo)
    const targetChannels = 1

    // Calculate new buffer length
    const newLength = Math.round(audioBuffer.length * targetSampleRate / originalSampleRate)

    // Create new audio buffer with optimized settings
    const newBuffer = audioContext.createBuffer(targetChannels, newLength, targetSampleRate)

    // Downsample and convert to mono
    const oldData = []
    for (let channel = 0; channel < numberOfChannels; channel++) {
      oldData.push(audioBuffer.getChannelData(channel))
    }

    const newData = newBuffer.getChannelData(0)

    for (let i = 0; i < newLength; i++) {
      const originalIndex = i * originalSampleRate / targetSampleRate
      const index = Math.floor(originalIndex)
      const fraction = originalIndex - index

      let sample = 0

      // Interpolate between samples and mix channels to mono
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = oldData[channel]
        if (index < channelData.length - 1) {
          sample += channelData[index] * (1 - fraction) + channelData[index + 1] * fraction
        } else if (index < channelData.length) {
          sample += channelData[index]
        }
      }

      // Average the channels for mono conversion
      newData[i] = sample / numberOfChannels
    }

    return newBuffer
  }

  // Convert AudioBuffer to WAV format with 8-bit option for even smaller files
  function audioBufferToWav(buffer, use8Bit = false) {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = use8Bit ? 1 : 2
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true)
    view.setUint16(32, numberOfChannels * bytesPerSample, true)
    view.setUint16(34, bytesPerSample * 8, true) // bits per sample
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true)

    // Convert float samples to PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))

        if (use8Bit) {
          // 8-bit unsigned PCM (0-255)
          const intSample = Math.round((sample + 1) * 127.5)
          view.setUint8(offset, intSample)
          offset += 1
        } else {
          // 16-bit signed PCM
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
          offset += 2
        }
      }
    }

    return arrayBuffer
  }

  async function handleAudioFileChange(event) {
    const file = event.target.files[0]
    if (!file) return

    setAudioFile(file)
    setIsConverting(true)

    try {
      let finalFile = file

      // Check if file is already WAV
      if (file.type !== 'audio/wav' && !file.name.toLowerCase().endsWith('.wav')) {
        console.log('Converting and optimizing audio format...')
        finalFile = await convertToWav(file)
        setConvertedWavFile(finalFile)
      } else {
        // Even if it's already WAV, we might want to optimize it
        console.log('Optimizing WAV file...')
        finalFile = await convertToWav(file)
        setConvertedWavFile(finalFile)
      }

      // Create preview URL
      const url = URL.createObjectURL(finalFile)
      setPreviewUrl(url)

    } catch (error) {
      console.error('Error converting audio:', error)
      toast.error('Failed to convert audio file. Please try a different file.')
    } finally {
      setIsConverting(false)
    }
  }

  // Clean up preview URL when component unmounts or file changes
  function cleanupPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("task_name", createParams.task_name)
    formData.append("youtube_video_url", createParams.youtube_video_url)
    formData.append("source_language", createParams.source_language)
    formData.append("speaker_number", createParams.speaker_number)
    formData.append("diarize", createParams.diarize)

    // Use converted WAV file if available, otherwise use original
    const fileToSubmit = convertedWavFile || audioFile
    formData.append("audio_file", fileToSubmit)

    try {
      const response = await maraiAPI.postCreateTranscriptingTask({
        "Content-Type": "multipart/form-data"
      }, formData)

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(`Error: ${errorData.error.internal_error}`)
        setIsSubmitting(false)
        return
      }

    } catch (error) {
      toast.error(`Error Catch: ${error}`)
      setIsSubmitting(false)
      return
    }

    toast.success("Create task success!")
    setIsSubmitting(false)
    cleanupPreview()
    router.push("/tasks")
  }

  return(
    <Card className="p-4 grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Label>Task Name</Label>
        <Input
          type="text"
          placeholder="nouman ali khan - akhirah"
          onChange={(e) => {handleChange("task_name", e.target.value)}}
          value={createParams.task_name}
        />
      </div>

      <div className="col-span-12">
        <Label>Input Mode</Label>
        <div className="flex gap-2">
          <Button size="sm" variant={inputMode === "file" ? "" : "outline"} onClick={() => setInputMode("file")}>File</Button>
          <Button size="sm" variant={inputMode === "youtube_url" ? "" : "outline"} onClick={() => setInputMode("youtube_url")} disabled>Youtube URL</Button>
        </div>
      </div>

      <div className={`col-span-12 ${inputMode === "file" ? "" : "hidden"}`}>
        <Label>File <span className="text-[11px]">(format: wav, mp3, mp4) - auto-optimized for transcription</span></Label>
        <Input
          id="audio_file"
          type="file"
          accept="audio/*,video/mp4"
          onChange={(e)=>handleAudioFileChange(e)}
        />

        {isConverting && (
          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
            <LoadingSpinner />
            Converting and optimizing audio...
          </div>
        )}

        {audioFile && !isConverting && (
          <div className="mt-2 text-sm text-gray-600">
            <div>Original: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</div>
            {convertedWavFile && (
              <div className="text-green-600">
                Optimized: {convertedWavFile.name} ({(convertedWavFile.size / 1024 / 1024).toFixed(2)} MB)
                <span className="ml-2 text-xs">
                  ({Math.round(((audioFile.size - convertedWavFile.size) / audioFile.size) * 100)}% smaller)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Audio Preview */}
        {previewUrl && (
          <div className="mt-4">
            <Label className="text-sm font-medium mb-2 block">Audio Preview (Optimized)</Label>
            <audio
              ref={audioRef}
              controls
              src={previewUrl}
              className="w-full"
              onError={() => {
                console.error('Error loading audio preview')
                toast.error('Error loading audio preview')
              }}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>

      <div className={`col-span-12 ${inputMode === "youtube_url" ? "" : "hidden"}`}>
        <Label>Youtube Video URL</Label>
        <Input
          type="text"
          placeholder="https://www.youtube.com/watch?v=5sVfTPaxRwk"
          onChange={(e) => {handleChange("youtube_video_url", e.target.value)}}
          value={createParams.youtube_video_url}
        />
      </div>

      <div className="col-span-4">
        <Label>Language</Label>
        <Select onValueChange={(value) => {handleChange("source_language", value)}} defaultValue={createParams.source_language}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <LanguageSelectList />
        </Select>
      </div>

      <div className="col-span-4">
        <Label>Speakers Count</Label>
        <Input
          type="number"
          onChange={(e) => {handleChange("speaker_number", e.target.value)}}
          value={createParams.speaker_number}
        />
      </div>

      <div className="col-span-4">
        <Label>Identify Speaker</Label>
        <Select onValueChange={(value) => {handleChange("diarize", value)}} defaultValue={createParams.diarize}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">False</SelectItem>
            <SelectItem value="true">True</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-12 flex justify-end">
        <Button
          size="sm"
          onClick={()=>handleSubmit()}
          disabled={isSubmitting || isConverting}
        >
          {isSubmitting ? <LoadingSpinner /> : "Submit Task"}
        </Button>
      </div>
    </Card>
  )
}

function FormDubbing() {
  const router = useRouter()
  const [createParams, setCreateParams] = useState(defaultCreateParams)
  const [videoFile, setVideoFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inputMode, setInputMode] = useState("file")

  function handleChange(name, value) {
    setCreateParams({
      ...createParams,
      [name]: value,
    })
  }

  function handleVideoFileChange(event) {
    setVideoFile(event.target.files[0])
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("task_name", createParams.task_name)
    formData.append("youtube_video_url", createParams.youtube_video_url)
    formData.append("voice_mode", createParams.voice_mode)
    formData.append("voice_name", createParams.voice_name)
    formData.append("voice_pitch", createParams.voice_pitch)
    formData.append("voice_rate", createParams.voice_rate)
    formData.append("source_language", createParams.source_language)
    formData.append("target_language", createParams.target_language)
    formData.append("speaker_number", createParams.speaker_number)
    formData.append("video_file", videoFile)

    try {
      const response = await maraiAPI.postCreateAutoDubbingTask({
        "Content-Type": "multipart/form-data"
      }, formData)

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(`Error: ${errorData.error.internal_error}`)
        setIsSubmitting(false)
        return
      }

    } catch (error) {
      toast.error(`Error Catch: ${error}`)
      setIsSubmitting(false)
      return
    }

    toast.success("Create task success!")
    setIsSubmitting(false)
    router.push("/tasks")
  }

  return(
    <Card className="p-4 grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Label>Task Name</Label>
        <Input
          type="text"
          placeholder="nouman ali khan - akhirah"
          onChange={(e) => {handleChange("task_name", e.target.value)}}
          value={createParams.task_name}
        />
      </div>

      <div className="col-span-12">
        <Label>Input Mode</Label>
        <div className="flex gap-2">
          <Button size="sm" variant={inputMode === "file" ? "" : "outline"} onClick={() => setInputMode("file")}>File</Button>
          <Button size="sm" variant={inputMode === "youtube_url" ? "" : "outline"} onClick={() => setInputMode("youtube_url")} disabled>Youtube URL</Button>
        </div>
      </div>

      <div className={`col-span-12 ${inputMode === "file" ? "" : "hidden"}`}>
        <Label>File <span className="text-[11px]">(format: mp4)</span></Label>
        <Input
          id="video_file"
          type="file"
          accept="video/mp4"
          onChange={(e)=>handleVideoFileChange(e)}
        />
      </div>

      <div className={`col-span-12 ${inputMode === "youtube_url" ? "" : "hidden"}`}>
        <Label>Youtube Video URL</Label>
        <Input
          type="text"
          placeholder="https://www.youtube.com/watch?v=5sVfTPaxRwk"
          onChange={(e) => {handleChange("youtube_video_url", e.target.value)}}
          value={createParams.youtube_video_url}
        />
      </div>

      <div className="col-span-12">
        <Label>Voice Mode</Label>
        <Select onValueChange={(value) => {handleChange("voice_mode", value)}} defaultValue={createParams.voice_mode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="edge-tts">Edge TTS</SelectItem>
            <SelectItem value="chatterbox">Chatterbox</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {createParams.voice_mode === "edge-tts"
        ? <>
          <div className="col-span-4">
            <Label>Voice Name</Label>
            <Input
              type="text"
              onChange={(e) => {handleChange("voice_name", e.target.value)}}
              value={createParams.voice_name}
              readOnly
            />
          </div>
          <div className="col-span-4">
            <Label>Voice Pitch</Label>
            <Input
              type="text"
              onChange={(e) => {handleChange("voice_pitch", e.target.value)}}
              value={createParams.voice_pitch}
              readOnly
            />
          </div>
          <div className="col-span-4">
            <Label>Voice Rate</Label>
            <Input
              type="text"
              onChange={(e) => {handleChange("voice_rate", e.target.value)}}
              value={createParams.voice_rate}
              readOnly
            />
          </div>
        </>
        : null
      }
      <div className="col-span-4">
        <Label>Source Language</Label>
        <Select onValueChange={(value) => {handleChange("source_language", value)}} defaultValue={createParams.source_language}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <LanguageSelectList />
        </Select>
      </div>
      {createParams.task_type.includes("dubbing") &&
        <div className="col-span-4">
          <Label>Target Language</Label>
          <Select onValueChange={(value) => {handleChange("target_language", value)}} defaultValue={createParams.target_language}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <LanguageSelectList />
          </Select>
        </div>
      }
      <div className="col-span-4">
        <Label>Number of Speakers</Label>
        <Input
          type="number"
          onChange={(e) => {handleChange("speaker_number", e.target.value)}}
          value={createParams.speaker_number}
        />
      </div>
      <div className="col-span-12 flex justify-end">
        <Button size="sm" onClick={()=>handleSubmit()} disabled={isSubmitting}>{isSubmitting ? <LoadingSpinner /> : "Submit Task"}</Button>
      </div>
    </Card>
  )
}

function LanguageSelectList() {
  return(
    <SelectContent>
      <SelectItem value="en">English</SelectItem>
      <SelectItem value="id">Indonesia</SelectItem>
    </SelectContent>
  )
}
