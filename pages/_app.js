import "@/styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import DefaultLayout from "@/components/layout/DefaultLayout";
import { ToastContainer } from "react-toastify";

export default function App({ Component, pageProps }) {
  return (
    <div>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <DefaultLayout>
          <Component {...pageProps} />
        </DefaultLayout>
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
