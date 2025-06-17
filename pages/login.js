import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { LogInIcon } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import maraiAPI from "@/apis/maraiAPI";
import { useRouter } from "next/router";

const G_CLIENT_ID = "915149914245-vd6k2rs1qgaeqddb1mticba2aumtaq4h.apps.googleusercontent.com"

export default function Login() {
  const router = useRouter()

  async function GoogleLoginCallback(credentialResponse) {
    try {
      const response = await maraiAPI.postSignIn({}, {
        google_credential: credentialResponse.credential
      })

      const body = await response.json()

      if (response.status !== 200) {
        console.error("GTK", credentialResponse.credential)
        toast.error(`Login gagal: ${JSON.stringify(body)}`)
        return
      }

      maraiAPI.setAuthToken(body.data.access_token)

      toast.info("Login sukses!")

      router.reload()

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2"><LogInIcon/> Login To MarAI</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <GoogleOAuthProvider clientId={G_CLIENT_ID}>
                    <GoogleLogin
                      className="block w-full text-center"
                      clientId={G_CLIENT_ID}
                      buttonText="Continue With Google"
                      onSuccess={GoogleLoginCallback}
                      onFailure={GoogleLoginCallback}
                      cookiePolicy={'single_host_origin'}
                    />
                  </GoogleOAuthProvider>
                </div>
              </div>
              <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
                By logging in, you agree to our <a href="#">Terms of Service</a>{" "}
                and <a href="#">Privacy Policy</a>. Your account will be automatically registered if not exists.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
