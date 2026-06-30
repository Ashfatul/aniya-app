import Link from "next/link";
import { Heart } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-soft-gradient">
      <Link href="/" className="flex flex-col items-center mb-8 group">
        <div className="w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform heart-pulse">
          <Heart className="w-10 h-10 text-white fill-white" />
        </div>
        <h1 className="font-script text-5xl mt-4 text-[var(--primary-dark)]">
          Aniya
        </h1>
        <p className="text-sm text-[var(--foreground)]/60 mt-1">
          Every moment, remembered
        </p>
      </Link>
      {children}
    </div>
  );
}