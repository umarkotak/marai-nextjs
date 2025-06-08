"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/icon"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import maraiAPI from "@/apis/maraiAPI"
import { ImageIcon, InfoIcon, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { FormatDateConcrete } from "@/lib/datetimeUtils"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import LogViewer from "@/components/log_viewer"

export default function TaskList() {
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
    <div className="flex flex-row justify-start w-full">
      <div className="flex flex-col gap-2 w-full">
        <Card className="p-4 flex justify-between items-center">
          <div>
            Task List
          </div>
          <div>
            <Link href="/tasks/create"><Button size="sm">+ Create</Button></Link>
          </div>
        </Card>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox id={`task-check-all`} />
              </TableHead>
              <TableHead>Thumbnail</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Task Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskList.map((oneTask) => (
              <TaskRow oneTask={oneTask} getTaskList={getTaskList} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TaskRow({oneTask, getTaskList}) {
  const [taskStatus, setTaskStatus] = useState({})

  async function getTaskStatus(oneTask) {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTaskStatus({}, {
        slug: oneTask.slug,
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat status task: ${JSON.stringify(body)}`)
        return
      }

      setTaskStatus(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    getTaskStatus(oneTask)

    const intervalId = setInterval(() => {
      if (oneTask.status === "completed") { return }
      getTaskStatus(oneTask)
    }, 5000);

    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId);
  }, [])

  async function deleteTask() {
    try {
      if (!confirm("are you sure want to delete this task? once deleted it cannot be restored again!")) {
        return
      }

      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.deleteTask({}, {
        slug: oneTask.slug,
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal menghapus task: ${JSON.stringify(body)}`)
        return
      }

      toast.success(`Task berhasil dihapus`)

      getTaskList()

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  async function processTask() {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.postProcessTask({}, {
        slug: oneTask.slug,
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memproses task: ${JSON.stringify(body)}`)
        return
      }

      toast.success(`Task sedang diproses kembali`)

      getTaskStatus(oneTask)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  return(
    <TableRow key={`task-${oneTask.id}`}>
      <TableCell>
        <Checkbox id={`task-${oneTask.id}-check`} />
      </TableCell>
      <TableCell>
        <Avatar className="h-10 w-20 rounded">
          <AvatarImage src={oneTask.thumbnail_url} alt="thumbnail" />
          <AvatarFallback className="rounded">
            <ImageIcon />
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell>{FormatDateConcrete(oneTask.created_at)}</TableCell>
      <TableCell className="flex flex-col">
        <span className="font-semibold">{oneTask.name}</span>
        <span className="text-[10px]">{oneTask.slug}</span>
      </TableCell>
      <TableCell>{oneTask.task_type}</TableCell>
      <TableCell>{FormatDateConcrete(oneTask.updated_at)}</TableCell>
      <TableCell>
        <div className="flex gap-1 items-center">
          {taskStatus?.is_running && <LoadingSpinner />}
          <span>{taskStatus?.is_running ? taskStatus?.task_progress_info?.running_status : taskStatus?.task_progress_info?.status}</span>
        </div>
      </TableCell>
      <TableCell>
        <Progress value={taskStatus?.task_progress_info?.progress_percent * 100} className="w-full" />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Sheet>
            <SheetTrigger><Button size="icon_6"><InfoIcon /></Button></SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{oneTask.name}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="flex flex-col gap-1 max-h-screen overflow-auto">
                  <div>
                    <label className="text-xs font-bold">slug:</label>
                    <div className="text-sm">{oneTask.slug}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">task type:</label>
                    <div className="text-sm">{oneTask.task_type}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">status:</label>
                    <div className="text-sm">[{taskStatus?.task_progress_info?.status_index}/{taskStatus?.task_progress_info?.final_index}] - {oneTask.status}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">youtube video url:</label>
                    <div className="text-sm text-primary">
                      <a href={oneTask.youtube_video_url} target="_blank">{oneTask.youtube_video_url}</a>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">progress:</label>
                    <div className="flex flex-col gap-1">
                      {taskStatus?.task_progress_info?.progresses.map((prog) => (
                        <div className="flex gap-1 items-center" key={`side-drawer-prog-${oneTask.slug}-${prog.status}`}>
                          <Checkbox id={`task-${oneTask.id}-check`} checked={prog.done} disabled />
                          {prog.status}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">logs:</label>
                    <LogViewer
                      slug={oneTask.slug}
                    />
                  </div>
                  {/* <div>
                    <label className="text-xs font-bold">metadata:</label>
                    <div className="text-xs bg-accent">
                      <pre>
                        {JSON.stringify(oneTask?.metadata, " ", "  ")}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold">metadata:</label>
                    <div className="text-xs bg-accent">
                      <pre>
                        {JSON.stringify(taskStatus, " ", "  ")}
                      </pre>
                    </div>
                  </div> */}
                  <hr className="mt-8 mb-24" />
                </div>
              </SheetDescription>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button size="icon_6"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {taskStatus?.task_progress_info?.status !== "completed" && taskStatus?.is_running === false &&
                <DropdownMenuItem onClick={() => processTask()}>Continue Process</DropdownMenuItem>
              }
              <Link href={`/tasks/${oneTask.slug}/${oneTask.task_type === "auto_dubbing" ? "dubbing" : "transcripting"}`}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => deleteTask()}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
