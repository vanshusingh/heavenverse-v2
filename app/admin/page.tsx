import { SignIn } from "@clerk/nextjs"

export default function AdminLogin() {
  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/bgg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />

      {/* Clerk SignIn */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-wide">
            Admin Access
          </h1>
          <p className="text-white/50 text-sm">
            Sign in to manage HeavenVerse V2
          </p>
        </div>
        <SignIn routing="hash" fallbackRedirectUrl="/admin/dashboard" />
      </div>
    </div>
  )
}
