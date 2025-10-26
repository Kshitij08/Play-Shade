"use client";

import { useState, useEffect } from "react";
import { useMiniKitUser } from "./useMiniKitUser";

export function useUserStreak() {
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getUserId, isLoading: userLoading } = useMiniKitUser();
  const userId = getUserId();
  useEffect(() => {
    const fetchStreak = async () => {
      if (userLoading) return;

      if (!userId || userId === "anonymous") {
        setStreak(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/streak?userId=${encodeURIComponent(userId)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch streak");
        }

        const data = (await response.json()) as { streak: number };
        setStreak(data.streak);
        setError(null);
      } catch (err) {
        console.error("Error fetching streak:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreak(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreak();
  }, [userLoading, userId]);

  return { streak, isLoading, error };
}
