import "@/styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import DefaultLayout from "@/components/layout/DefaultLayout";

export default function App({ Component, pageProps }) {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <DefaultLayout>
          <Component {...pageProps} />
        </DefaultLayout>
      </ThemeProvider>
    </>
  )
}
