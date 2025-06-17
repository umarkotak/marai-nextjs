import "@/styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import { ToastContainer } from "react-toastify";
import { Loader2Icon } from "lucide-react";
import GeneralLayout from "@/components/layout/GeneralLayout";
import AuthLayout from "@/components/layout/AuthLayout";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

const GENERAL_PATHS = ['/home', '/login']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(null)

  useEffect(() => {
    setIsAuthenticated(!!Cookies.get('MAIAT'))
  }, [])

   if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex min-h-svh w-full items-center justify-center">
        <div className="flex justify-center items-center flex-col w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2 leading-tight text-center">
            Welcome to Dashboard
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent block">
              MarAI
            </span>
          </h1>
          <Loader2Icon className='animate-spin' />
        </div>
      </div>
    )
  }

  const Layout = !GENERAL_PATHS.includes(router.pathname) && isAuthenticated ? AuthLayout : GeneralLayout

  return (
    <div>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  )
}
