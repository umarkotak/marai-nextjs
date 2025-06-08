"use client"

import {
  AudioWaveform,
  BookOpen,
  Bot,
  BrainIcon,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { TeamSwitcher } from "./TeamSwitcher"
import { NavMain } from "./NavMain"
import { NavProjects } from "./NavProjects"
import { NavUser } from "./NavUser"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import maraiAPI from "@/apis/maraiAPI"
import { toast } from "react-toastify"

// This is sample data.
const data = {
  products: [
    {
      name: "MarAI",
      logo: BrainIcon,
      link: "/",
    },
  ],
  navMain: [
    {
      title: "Tasks",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "Create", url: "/tasks/create", },
        { title: "List", url: "/tasks", },
      ],
    },
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: Settings2,
    //   isActive: true,
    //   items: [
    //     { title: "General", url: "#", },
    //     { title: "Team", url: "#", },
    //     { title: "Billing", url: "#", },
    //     { title: "Limits", url: "#", },
    //   ],
    // },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }) {
  const pathname = usePathname()

  const [userData, setUserData] = useState({})

  async function getUserData() {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getCheckAuth({}, {})

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat data user: ${JSON.stringify(body)}`)
        return
      }

      setUserData({...body.data, logged_in: true})

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    getUserData()
  }, [pathname])

  return (
    <Sidebar
      className="z-30"
      collapsible="icon"
      variant="sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-primary py-1">
        <TeamSwitcher products={data.products} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
