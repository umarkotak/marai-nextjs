import maraiAPI from "@/apis/maraiAPI";
import SubtitleTimeline from "@/components/SubtitleTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, ClapperboardIcon, DownloadIcon, MoreHorizontalIcon, Play, Save, SettingsIcon, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import dynamic from 'next/dynamic';
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";
import UploadSheet from "@/components/UploadSheet";
import { LoadingSpinner } from "@/components/ui/icon";
const ReactPlayerClient = dynamic(() => import('@/components/ReactPlayerClient'), { ssr: false });

export default function TaskSubtitle() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [taskDetail, setTaskDetail] = useState({})
  const [playerState, setPlayerState] = useState({
    playing: false,
    seekto: 0,
  })
  const [subtitleInfo, setSubtitleInfo] = useState({
    duration_ms: 60000
  })
  const playerRef = useRef(null)
  const finalPlayerRef = useRef(null)
  const { open } = useSidebar()
  const [activeLine, setActiveLine] = useState({})
  const [vttTimestamp, setVttTimestamp] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewTimestamp, setPreviewTimestamp] = useState(null)

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

  async function GetSubtitleInfo(slug) {
    if (!slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getSubtitleInfo({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task subtitle info: ${JSON.stringify(body)}`)
        return
      }

      setSubtitleInfo(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    if (!router.query.slug) { return }

    GetTaskDetail(router.query.slug)
    GetSubtitleInfo(router.query.slug)

    setVttTimestamp(Date.now())
  }, [router])

  useEffect(() => {

  }, [activeLine])

  function handleTranslatedTextChange(index, newValue) {
    setSubtitleInfo(prevInfo => {
      const updatedInfo = { ...prevInfo };
      if (updatedInfo.translated_transcripts?.transcript_lines[index]) {
        updatedInfo.translated_transcripts.transcript_lines[index] = {
          ...updatedInfo.translated_transcripts.transcript_lines[index],
          value: newValue
        };
      }
      return updatedInfo;
    });
  };

  async function updateSubtitleSegment(seg) {
    if (!router.query.slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      seg.speaker = ""
      seg.slug = router.query.slug
      const response = await maraiAPI.patchUpdateTaskTranscriptSegment({}, seg)

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memperbarui subtitle segment: ${JSON.stringify(body)}`)
        return
      }

      toast.success("segment updated!")
      setVttTimestamp(Date.now())

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  const [renderLoading, setRenderLoading] = useState(false);
  async function renderSubtitle() {
    if (!router.query.slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      setRenderLoading(true)
      const response = await maraiAPI.postRenderSubtitle({}, {
        slug: router.query.slug,
      })

      const body = await response.json()
      setRenderLoading(false)

      if (response.status !== 200) {
        toast.error(`Gagal render video dengan subtitle: ${JSON.stringify(body)}`)
        return
      }

      toast.success("Video with subtitle rendered successfully")

      GetTaskDetail(router.query.slug)

    } catch(e) {
      toast.error(`Error: ${e}`)
      setRenderLoading(false)
    }
  }

  function handlePreviewRender() {
    setPreviewTimestamp(Date.now())
    setShowPreviewModal(true)
  }

  function handleClosePreviewModal() {
    setShowPreviewModal(false)
    setPreviewTimestamp(null)
  }

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
            <div className={`flex flex-col gap-4 overflow-auto ${open ? "h-[calc(100vh-330px)]" : "h-[calc(100vh-330px)]"}`}>
              {Array.from({ length: subtitleInfo?.max_track_segment }, (_, i) => (
                <div key={`transcript-segment-${i}`} className={`grid grid-cols-12 text-sm gap-2 p-0.5`}>
                  <div className="col-span-5">
                    <Textarea
                      value={subtitleInfo?.original_transcript?.transcript_lines[i].value}
                      className="rounded-none p-1 bg-muted"
                      readOnly
                    />
                  </div>
                  <div className="col-span-6">
                    <Textarea
                      value={subtitleInfo?.translated_transcripts?.transcript_lines[i]?.value || ''}
                      className={`rounded-none p-1 bg-accent
                        ${activeLine.id === subtitleInfo?.translated_transcripts?.transcript_lines[i]?.id ? "border-2 border-primary" : ""}
                      `}
                      onChange={(e) => handleTranslatedTextChange(i, e.target.value)}
                      onClick={() => {setActiveLine(subtitleInfo?.translated_transcripts?.transcript_lines[i])}}
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <Button
                      className="rounded-none w-full h-full" size="xs"
                      onClick={() => updateSubtitleSegment(subtitleInfo?.translated_transcripts?.transcript_lines[i])}
                    ><Save /></Button>
                    <Button className="rounded-none w-full h-full" size="xs"><MoreHorizontalIcon /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-2">
            <div key={`player-ts=${vttTimestamp}`} className={``}>
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
                      {
                        kind: 'subtitles', src: `${taskDetail?.translated_transcript_url}?ts=${vttTimestamp}`, srcLang: 'id', default: true
                      },
                    ],
                  },
                }}
                // controls={true}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm" onClick={() => renderSubtitle()}
                disabled={renderLoading}
              >
                {renderLoading ? <LoadingSpinner /> : <ClapperboardIcon />} Render Subtitle
              </Button>
              {taskDetail?.publish_metadata?.rendered &&
                <Button size="sm" onClick={handlePreviewRender}>
                  <Play /> Preview Render
                </Button>
              }
              <UploadSheet slug={router.query.slug} />
            </div>
          </div>
        </div>

        <div className={`flex-none transition-all ${open ? "w-[calc(100vw-240px)]" : "w-[calc(100vw-65px)]"}`}>
          <SubtitleTimeline
            playerState={playerState}
            setPlayerState={setPlayerState}
            playerRef={playerRef}
            taskDetail={taskDetail}
            subtitleInfo={subtitleInfo}
            activeLine={activeLine}
            setActiveLine={setActiveLine}
            setSubtitleInfo={setSubtitleInfo}
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-4xl max-h-[90vh] w-full mx-4 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Preview Rendered Video</h2>
              <Button
                size="icon_7"
                variant="outline"
                onClick={handleClosePreviewModal}
              >
                <X />
              </Button>
            </div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <ReactPlayerClient
                playerRef={finalPlayerRef}
                url={`${taskDetail.final_video_url}?ts=${previewTimestamp}`}
                playing={true}
                muted={false}
                controls={false}
                width="100%"
                height="100%"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}