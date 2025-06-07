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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskList.map((oneTask) => (
              <TaskRow oneTask={oneTask} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TaskRow({oneTask}) {
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
      <TableCell>{oneTask.status}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Drawer>
            <DrawerTrigger>
              <Button size="icon_6">
              <InfoIcon />
            </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                <DrawerDescription>This action cannot be undone.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button size="icon_6">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
