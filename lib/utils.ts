import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatImageUrl(url?: string | null): string {
  if (!url) return "/placeholder.svg"
  if (url.startsWith("blob:") || url.startsWith("data:")) return url
  let clean = url.replace("10.0.2.2:8000", "localhost:8000").replace("127.0.0.1:8000", "localhost:8000")
  if (clean.startsWith("/uploads/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    clean = `${apiBase}${clean}`
  }
  return clean
}
