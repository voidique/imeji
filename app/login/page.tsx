"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { getToken } from "@/lib/api"
import { signIn, signUp } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import { DotImage } from "@/components/dot-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "sign-in" | "sign-up"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("sign-in")
  const [submitting, setSubmitting] = useState(false)

  // already signed in? skip to app
  useEffect(() => {
    if (getToken()) router.replace("/mindmaps")
  }, [router])

  async function handle(action: () => Promise<unknown>) {
    setSubmitting(true)
    try {
      await action()
      router.replace("/mindmaps")
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <span className="text-xl font-semibold tracking-tight">Imeji</span>

          {/* keyed wrapper re-animates on every mode switch */}
          <div
            key={mode}
            className="animate-in fade-in-0 slide-in-from-bottom-3 mt-10 duration-500 ease-out"
          >
            <h1 className="text-3xl font-semibold tracking-tight">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "sign-in"
                ? "Sign in to pick up where you left off."
                : "Start turning scattered ideas into maps."}
            </p>

            {mode === "sign-in" ? (
              <form
                className="mt-8 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  handle(() =>
                    signIn({
                      email: String(fd.get("email")),
                      password: String(fd.get("password")),
                    }),
                  )
                }}
              >
                <Field id="si-email" name="email" type="email" label="Email" />
                <Field
                  id="si-password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-2 h-11 rounded-full"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            ) : (
              <form
                className="mt-8 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  handle(() =>
                    signUp({
                      name: String(fd.get("name")),
                      email: String(fd.get("email")),
                      password: String(fd.get("password")),
                    }),
                  )
                }}
              >
                <Field id="su-name" name="name" type="text" label="Name" />
                <Field id="su-email" name="email" type="email" label="Email" />
                <Field
                  id="su-password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-2 h-11 rounded-full"
                >
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
              </form>
            )}
          </div>

          {/* toggle */}
          <p className="text-muted-foreground mt-8 text-sm">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-up")}
                  className="text-foreground font-medium underline-offset-4 transition-colors hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-in")}
                  className="text-foreground font-medium underline-offset-4 transition-colors hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* art panel */}
      <div className="relative hidden items-center justify-center overflow-hidden p-12 lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 90% 70% at 70% 20%, oklch(0.9 0.03 250 / 0.5), transparent 60%), radial-gradient(ellipse 80% 60% at 20% 90%, oklch(0.9 0.03 60 / 0.4), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col items-center">
          <div
            className="clay overflow-hidden rounded-[28px] p-3"
            style={{ backgroundColor: "#7a9bc4" }}
          >
            <DotImage
              src="/art/parasol.jpg"
              alt="Claude Monet, Woman with a Parasol"
              gap={6}
              dotRadius={2}
              className="aspect-[3/4] w-[300px] overflow-hidden rounded-[18px]"
            />
          </div>
          <p className="text-foreground/80 mt-8 max-w-xs text-center text-balance">
            Like scattered dots forming a picture, your thoughts become a map.
          </p>
        </div>
      </div>
    </main>
  )
}

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
}: {
  id: string
  name: string
  type: string
  label: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="h-11"
      />
    </div>
  )
}
