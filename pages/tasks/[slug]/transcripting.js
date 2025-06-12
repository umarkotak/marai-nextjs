import maraiAPI from "@/apis/maraiAPI";
import MovieTimeline from "@/components/MovieTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DownloadIcon, SettingsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

export default function TaskTranscripting() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [taskDetail, setTaskDetail] = useState({})
  const [transcriptInfo, setTranscriptInfo] = useState({
    duration_ms: 60000
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

  async function GetTranscriptInfo(slug) {
    if (!slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTranscriptInfo({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task transcript info: ${JSON.stringify(body)}`)
        return
      }

      setTranscriptInfo(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    if (!router.query.slug) { return }

    GetTaskDetail(router.query.slug)
    GetTranscriptInfo(router.query.slug)
  }, [router])

  return (
    <div className="flex flex-row justify-start w-full overflow-auto">
      <div className="flex flex-col gap-2 w-full justify-between h-[calc(100vh-74px)]">
        <div className="flex-1 grid grid-cols-12 gap-x-2 overflow-auto">
          <div className="col-span-4">
            <div className="flex justify-between items-center">
              <div>Transcript</div>
              <div>
                <Button size="icon_7"><SettingsIcon /></Button>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: transcriptInfo?.max_track_segment }, (_, i) => (
                <div key={`transcript-segment-${i}`} className="grid grid-cols-2 text-sm gap-2 p-0.5 border rounded-md">
                  <div>
                    <Textarea
                      value={transcriptInfo?.original_transcript?.transcript_lines[i].value}
                      className="h-24"
                      readOnly
                    />
                  </div>
                  <div>
                    <Textarea
                      value={transcriptInfo?.translated_transcripts?.transcript_lines[i].value}
                      className="h-24"
                      onChange={() => {}}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-8">
            <div className="flex justify-between items-center">
              <div className="font-semibold">{taskDetail?.name}</div>
              <div>
                <Button size="icon_7"><DownloadIcon /></Button>
              </div>
            </div>

            <div className="mt-2">
            </div>
          </div>
        </div>

        <div className="flex-none">
          {/* <MovieTimeline
            playerState={playerState}
            setPlayerState={setPlayerState}
            playerRef={playerRef}
            taskDetail={taskDetail}
            dubbingInfo={dubbingInfo}
          /> */}
        </div>
      </div>
    </div>
  );
}
