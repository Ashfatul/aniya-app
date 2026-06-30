import Link from "next/link";
import { Heart, Camera, Calendar, Users, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // If user is already signed in, jump straight to the timeline.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/timeline");

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="max-w-4xl w-full flex flex-col items-center text-center mt-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-xl heart-pulse">
            <Heart className="w-12 h-12 text-white fill-white" />
          </div>
          <div className="absolute -top-1 -right-1 text-3xl">🌸</div>
        </div>
        <h1 className="font-script text-7xl mt-6 text-[var(--primary-dark)]">
          Aniya
        </h1>
        <p className="text-2xl text-[var(--foreground)]/70 mt-2 max-w-xl text-balance">
          A private memory book for your baby&apos;s precious moments
        </p>
        <p className="text-[var(--foreground)]/50 mt-4 max-w-md text-balance">
          Photos, milestones, growth, and the little things you never want to forget — kept safe, beautifully.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link href="/signup">
            <Button size="lg">
              Start your memory book
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 w-full">
          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="Memories"
            desc="Photos & notes for every precious moment"
            color="bg-[var(--primary)]"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Timeline"
            desc="Auto-built feed of her growing life"
            color="bg-[var(--accent)]"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Shared"
            desc="Family can view or contribute"
            color="bg-[var(--accent-2)]"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Private"
            desc="Password-protected, end-to-end yours"
            color="bg-[var(--accent-3)]"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[var(--border)] text-left">
      <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--foreground)]/60 mt-1">{desc}</p>
    </div>
  );
}
