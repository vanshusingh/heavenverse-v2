import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-white/60 mt-2">Could not find requested resource</p>
      <Link href="/" className="mt-4 px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-white/90 transition-all">
        Return Home
      </Link>
    </div>
  )
}
