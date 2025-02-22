import "@/styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import DefaultLayout from "@/components/layout/DefaultLayout";

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
    </div>
  )
}
