import maraiAPI from "@/apis/maraiAPI";
import SubtitleTimeline from "@/components/SubtitleTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, DownloadIcon, MoreHorizontalIcon, Play, SettingsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import dynamic from 'next/dynamic';
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";
const ReactPlayerClient = dynamic(() => import('@/components/ReactPlayerClient'), { ssr: false });

export default function TaskDubbing() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [taskDetail, setTaskDetail] = useState({})
  const [playerState, setPlayerState] = useState({
    playing: false,
    seekto: 0,
  })
  const [dubbingInfo, setDubbingInfo] = useState({
    duration_ms: 60000
  })
  const playerRef = useRef(null)
  const { open } = useSidebar()
  const [activeLine, setActiveLine] = useState({})

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

  async function GetDubbingInfo(slug) {
    if (!slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getDubbingInfo({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task dubbing info: ${JSON.stringify(body)}`)
        return
      }

      setDubbingInfo(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    if (!router.query.slug) { return }

    GetTaskDetail(router.query.slug)
    GetDubbingInfo(router.query.slug)
  }, [router])

  useEffect(() => {

  }, [activeLine])

  return (
    <div className="flex flex-row justify-start w-full overflow-auto">
      <div className="flex flex-col gap-2 w-full justify-between h-[calc(100vh-74px)]">
        <div className="flex justify-between items-center bg-muted py-1">
          <div className="flex items-center gap-1">
            <Link href="/tasks"><Button size="icon_7" variant="outline" ><ArrowLeftIcon /></Button></Link>
            <span>Subtitle: {taskDetail?.name}</span>
          </div>
          <div>
            <Button size="icon_7"><SettingsIcon /></Button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-x-2 overflow-auto">
          <div className="col-span-7">
            <div className="flex flex-col gap-4 h-[calc(100vh-360px)] overflow-auto">
              {Array.from({ length: dubbingInfo?.max_track_segment }, (_, i) => (
                <div key={`transcript-segment-${i}`} className={`grid grid-cols-12 text-sm gap-2 p-0.5`}>
                  <div className="col-span-5">
                    <Textarea
                      value={dubbingInfo?.original_transcript?.transcript_lines[i].value}
                      className="rounded-none p-1 bg-muted"
                      readOnly
                    />
                  </div>
                  <div className="col-span-6">
                    <Textarea
                      value={dubbingInfo?.translated_transcripts?.transcript_lines[i].value}
                      className={`rounded-none p-1 bg-accent
                        ${activeLine.id === dubbingInfo?.translated_transcripts?.transcript_lines[i].id ? "border-2 border-primary" : ""}
                      `}
                      onChange={() => {}}
                      onClick={() => {setActiveLine(dubbingInfo?.translated_transcripts?.transcript_lines[i])}}
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <Button className="rounded-none w-full h-full" size="xs"><Play /></Button>
                    <Button className="rounded-none w-full h-full" size="xs"><MoreHorizontalIcon /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5">
            <div className="">
              <ReactPlayerClient
                playerRef={playerRef}
                playerState={playerState}
                url={taskDetail.raw_video_url}
                playing={playerState.playing}
                muted={false}
                config={{
                  file: {
                    attributes: {
                      crossOrigin: "true",
                    },
                    tracks: [
                      {kind: 'subtitles', src: `${taskDetail?.translated_transcript_url}?ts=${Date.now()}`, srcLang: 'id', default: true},
                    ],
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className={`flex-none transition-all ${open ? "w-[calc(100vw-240px)]" : "w-[calc(100vw-65px)]"}`}>
          <SubtitleTimeline
            playerState={playerState}
            setPlayerState={setPlayerState}
            playerRef={playerRef}
            taskDetail={taskDetail}
            dubbingInfo={dubbingInfo}
            activeLine={activeLine}
            setActiveLine={setActiveLine}
          />
        </div>
      </div>
    </div>
  );
}
