"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** Re-sorts the board automatically when work changes (§124), via Realtime. */
export function TeamBoardLive() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 500);
    };
    const channel = supabase
      .channel("team-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_records" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_tasks" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, bump)
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
