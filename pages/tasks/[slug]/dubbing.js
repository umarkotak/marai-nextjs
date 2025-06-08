import maraiAPI from "@/apis/maraiAPI";
import MovieTimeline from "@/components/MovieTimeline";
import ReactPlayerClient from "@/components/ReactPlayerClient";
import { Button } from "@/components/ui/button";
import { DownloadIcon, SettingsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { toast } from "react-toastify";

export default function TaskDubbing() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [taskDetail, setTaskDetail] = useState({})
  const [playerState, setPlayerState] = useState({
    playing: false
  })

  async function GetTaskDetail(slug) {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTaskDetail({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task detail: ${JSON.stringify(body)}`)
        return
      }

      setTaskDetail(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    if (!router.query.slug) { return }

    GetTaskDetail(router.query.slug)
  }, [router])

  return (
    <div className="flex flex-row justify-start w-full overflow-auto">
      <div className="flex flex-col gap-2 w-full justify-between h-[calc(100vh-74px)]">
        <div className="flex-1 grid grid-cols-12 gap-x-2 overflow-auto">
          <div className="col-span-5">
            <div className="flex justify-between items-center">
              <div>Transcript</div>
              <div>
                <Button size="icon_7"><SettingsIcon /></Button>
              </div>
            </div>
          </div>

          <div className="col-span-7">
            <div className="flex justify-between items-center">
              <div className="font-semibold">{taskDetail?.name}</div>
              <div>
                <Button size="icon_7"><DownloadIcon /></Button>
              </div>
            </div>

            <div className="mt-2">
              <ReactPlayerClient
                url={taskDetail.final_video_url}
                playing={playerState.playing}
              />
            </div>
          </div>
        </div>

        <div className="flex-none">
          <MovieTimeline
            playerState={playerState}
            setPlayerState={setPlayerState}
            taskDetail={taskDetail}
          />
        </div>
      </div>
    </div>
  );
}
