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
import { useState } from "react"
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
}
export default function TaskCreate() {
  const router = useRouter()

  const [createParams, setCreateParams] = useState(defaultCreateParams)
  const [videoFile, setVideoFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(name, value) {
    setCreateParams({
      ...createParams,
      [name]: value,
    })
  }

  function handleVideoFileChange(event) {
    setVideoFile(event.target.files[0])
  }

  function handleAudioFileChange(event) {
    setAudioFile(event.target.files[0])
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
    formData.append("audio_file", audioFile)

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
      toast.error(`Error: ${error}`)
      setIsSubmitting(false)
      return
    }

    toast.success("Create task success!")
    setIsSubmitting(false)
    router.push("/tasks")
  }

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col gap-2 w-full max-w-xl">
        <Card className="p-4">
          Create New Task
        </Card>

        <Card className="p-4 flex flex-col gap-4">
          <div className="flex gap-1 items-center">
            <div className="w-4/12">
              <Label>Task Type</Label>
              <Select onValueChange={(value) => {handleChange("task_type", value)}} defaultValue={createParams.task_type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_dubbing">Auto Dubbing Video</SelectItem>
                  <SelectItem value="transcripting">Transcripting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Task Name</Label>
              <Input
                type="text"
                placeHolder="nouman ali khan - akhirah"
                onChange={(e) => {handleChange("task_name", e.target.value)}}
                value={createParams.task_name}
              />
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-4/12">
              <Label>Input Source</Label>
              <Select onValueChange={(value) => {handleChange("video_input", value)}} defaultValue={createParams.video_input}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube_video_url">Youtube Video URL</SelectItem>
                  <SelectItem value="video_file">Video File</SelectItem>
                  {createParams.task_type === "transcripting" && <SelectItem value="audio_file">Audio File</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {createParams.video_input === "youtube_video_url"
              ? <div className="flex-1">
                <Label>Youtube Video URL</Label>
                <Input
                  type="text"
                  placeHolder="https://www.youtube.com/watch?v=5sVfTPaxRwk"
                  onChange={(e) => {handleChange("youtube_video_url", e.target.value)}}
                  value={createParams.youtube_video_url}
                />
              </div>
              : createParams.video_input === "video_file"
              ? <div className="flex-1">
                <Label>Video File</Label>
                <Input
                  type="file"
                  // accept="application/pdf"
                  onChange={(e)=>handleVideoFileChange(e)}
                />
              </div>
              : <div className="flex-1">
                <Label>Audio File</Label>
                <Input
                  type="file"
                  // accept="application/pdf"
                  onChange={(e)=>handleAudioFileChange(e)}
                />
              </div>
            }
          </div>
          <div>
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
            ? <div className="flex gap-1 items-center">
              <div className="w-full">
                <Label>Voice Name</Label>
                <Input
                  type="text"
                  onChange={(e) => {handleChange("voice_name", e.target.value)}}
                  value={createParams.voice_name}
                />
              </div>
              <div className="w-full">
                <Label>Voice Pitch</Label>
                <Input
                  type="text"
                  onChange={(e) => {handleChange("voice_pitch", e.target.value)}}
                  value={createParams.voice_pitch}
                />
              </div>
              <div className="w-full">
                <Label>Voice Rate</Label>
                <Input
                  type="text"
                  onChange={(e) => {handleChange("voice_rate", e.target.value)}}
                  value={createParams.voice_rate}
                />
              </div>
            </div>
            : null
          }
          <div className="flex gap-1 items-center">
            <div className="flex-1">
              <Label>Source Language</Label>
              <Select onValueChange={(value) => {handleChange("source_language", value)}} defaultValue={createParams.source_language}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <LanguageSelectList />
              </Select>
            </div>
            <div className="flex-1">
              <Label>Target Language</Label>
              <Select onValueChange={(value) => {handleChange("target_language", value)}} defaultValue={createParams.target_language}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <LanguageSelectList />
              </Select>
            </div>
            <div className="flex-1">
              <Label>Number of Speakers</Label>
              <Input
                type="number"
                onChange={(e) => {handleChange("speaker_number", e.target.value)}}
                value={createParams.speaker_number}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={()=>handleSubmit()} disabled={isSubmitting}>{isSubmitting ? <LoadingSpinner /> : "Submit Task"}</Button>
          </div>
        </Card>
      </div>
    </div>
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