import maraiAPI from "@/apis/maraiAPI";
import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, Clipboard, Check, InfoIcon, UploadIcon } from 'lucide-react';
import { toast } from "react-toastify";
import { LoadingSpinner } from "./ui/icon";
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
import { Button } from "./ui/button";
import { Avatar, AvatarImage } from "./ui/avatar";
import Link from "next/link";

export default function UploadSheet ({
  slug,
}) {
  const [taskDetail, setTaskDetail] = useState({})
  const [uploadAccounts, setUploadAccounts] = useState([]);

  async function openCallback() {
    getUploadAccounts()
    getTaskDetail(slug)
  }

  async function getTaskDetail(slug) {
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

  async function getUploadAccounts() {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getUploadAccounts({}, {})

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat upload account list: ${JSON.stringify(body)}`)
        return
      }

      setUploadAccounts(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  async function deleteUploadAccount(accountId) {
    if (!confirm("Are you sure you want to unlink this account?")) {
      return
    }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.deleteUploadAccount({}, {
        id: accountId,
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal menghapus upload account: ${JSON.stringify(body)}`)
        return
      }

      getUploadAccounts()

      toast.success("Upload account deleted successfully")

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  async function connectToYoutube() {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.postUploadAccountYoutubeInit({}, {})

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal menyambungkan akun youtube: ${JSON.stringify(body)}`)
        return
      }

      var youtube_login_url = body.data.youtube_login_url
      if (youtube_login_url) {
        window.open(youtube_login_url, "_blank")
      }

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  async function reLogin(targetType) {
    if (targetType === "youtube") {
      connectToYoutube()
    }
  }

  const [uploadLoading, setUploadLoading] = useState(false);
  async function handleUpload(accountId) {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      setUploadLoading(true)
      const response = await maraiAPI.postTaskPublish({}, {
        slug: slug,
        upload_account_id: accountId,
      })
      setUploadLoading(false)

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal mengupload video ke youtube: ${JSON.stringify(body)}`)
        return
      }

      getTaskDetail(slug)

    } catch(e) {
      toast.error(`Error: ${e}`)
      setUploadLoading(false)
    }
  }

  return(
    <Sheet className="w-full max-w-2xl">
      <SheetTrigger>
        <Button size="sm" onClick={openCallback}><UploadIcon />Upload</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Upload Menu</SheetTitle>
        </SheetHeader>
        <SheetDescription>
          <div className="flex flex-col gap-2">
            <div className="text-xl flex">
              <span>Account List</span>
            </div>
            <div className="text-lg flex">
              <Button size="xs" onClick={() => connectToYoutube()}>connect youtube</Button>
            </div>
            <div className="flex flex-col gap-2">
              {uploadAccounts.map((account, index) => (
                <div key={account.id} className="flex flex-col gap-2 bg-accent shadow-md p-2 rounded-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={account.picture} alt={account.email} />
                      </Avatar>
                      <div>
                        <div className="text-sm">{account.email}</div>
                        <div className="text-xs">{account.target_type}</div>
                      </div>
                    </div>
                    <div className="text-xs">
                      {account.is_expired ? "Expired" : "Active"}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="xs" onClick={() => deleteUploadAccount(account.id)}>delete</Button>
                    {account.is_expired && <Button size="xs" onClick={() => reLogin(account.target_type)}>re-login</Button>}
                    <Button size="xs" onClick={() => {handleUpload(account.id)}} disabled={uploadLoading || account.is_expired}>
                      {uploadLoading && <LoadingSpinner />} upload
                    </Button>
                  </div>
                  {/* <span className="text-sm">{JSON.stringify(account)}</span> */}
                </div>
              ))}
            </div>
            <div className="text-xl flex">
              <span>Uploaded Link</span>
            </div>
            <div className="flex flex-col gap-2">
              {taskDetail?.publish_metadata?.youtube_url && <div>
                <div>Youtube:</div>
                <div>
                  <Link target="_blank" href={taskDetail?.publish_metadata?.youtube_url}>{taskDetail?.publish_metadata?.youtube_url}</Link>
                </div>
              </div>}
            </div>
          </div>
        </SheetDescription>
      </SheetContent>
    </Sheet>
  )
}
