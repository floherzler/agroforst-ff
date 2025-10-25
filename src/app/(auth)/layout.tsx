"use client";

// import { BackgroundBeams } from "@/components/ui/background-beams";
import { useAuthStore } from "@/store/Auth"
import { useRouter } from "next/navigation";
import React from "react";


const Layout = ({ children }: { children: React.ReactNode }) => {
  const { session, user } = useAuthStore();
  const router = useRouter()

  React.useEffect(() => {
    if (session && user) {
      console.log(user.labels)
      if (user.labels.includes('admin')) {
        router.push('/zentrale')
      } else {
        router.push('/')
      }
    }
  }, [session, user, router])

  if (session) {
    return null
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f1e8] px-4 py-16 sm:px-6">
      {/* <BackgroundBeams /> */}
      <div className="relative w-full max-w-xl">{children}</div>
    </div>
  )
}


export default Layout
