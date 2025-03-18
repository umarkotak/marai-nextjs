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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/icon"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import maraiAPI from "@/apis/maraiAPI"
import { MoreHorizontal } from "lucide-react"

export default function TaskList() {
  // {
  //   "id": 4,
  //   "created_at": "2025-03-10T08:55:55.652144+07:00",
  //   "updated_at": "2025-03-10T10:35:44.00934+07:00",
  //   "user_id": 1,
  //   "slug": "task-spacex-1741571755",
  //   "name": "spacex",
  //   "task_type": "auto_dubbing",
  //   "status": "audio_transcript_translated",
  //   "publish": false,
  //   "thumbnail_url": "",
  //   "youtube_video_url": ""
  // }
  const [taskList, setTaskList] = useState([])

  async function getTaskList() {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTaskList({}, {})

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task list: ${JSON.stringify(body)}`)
        return
      }

      setTaskList(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    getTaskList()
  }, [])

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col gap-4 w-full max-w-xl">
        <Card className="p-4">
          Task - List
        </Card>

        {taskList.map((oneTask) => (
          <Card key={`task-${oneTask.id}`}>
            <CardHeader className="p-4 pb-">
              <div className="flex justify-between">
                <div className="text-sm flex">
                  {oneTask.slug}
                </div>
                <div className="text-sm flex">
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-row gap-4 items-center justify-between">
                <img src="https://placehold.co/400" className="w-24 h-24 rounded" />
                <div className="w-full flex flex-col gap-0.5">
                  <div className="text-sm flex">
                    <span className="w-16">name</span>: {oneTask.name}
                  </div>
                  <div className="text-sm flex">
                    <span className="w-16">status</span>: {oneTask.status}
                  </div>
                </div>
                <div>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
