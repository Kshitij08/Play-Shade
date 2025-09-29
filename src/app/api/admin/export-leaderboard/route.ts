/**
 * Export Leaderboard API
 *
 * This endpoint exports daily leaderboard data as CSV with password authentication.
 *
 * Authentication: Requires 'password' header matching env.PASSWORD
 *
 * Query Parameters:
 * - date: Single date (YYYY-MM-DD)
 * - date-from: Start date (YYYY-MM-DD)
 * - date-to: End date (YYYY-MM-DD)
 * - gameType: "all" | "color-mixing" | "finding" (default: "all")
 * - includeAddress: "true" | "false" (default: "false") - Fetches Ethereum addresses from Farcaster API
 *
 * Example: GET /api/admin/export-leaderboard?date=2025-10-01&includeAddress=true
 *
 * See README.md in this directory for full documentation.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaderboard } from "@/db/schema";
import { and, gte, lte, eq, desc, asc } from "drizzle-orm";

// Verify password authentication
function verifyAuth(request: Request): boolean {
  const password = request.headers.get("password");
  const expectedPassword = process.env.PASSWORD;

  if (!expectedPassword) {
    console.error("PASSWORD environment variable is not set");
    return false;
  }

  return password === expectedPassword;
}

// Fetch Ethereum addresses from Farcaster API in batches
async function fetchFarcasterAddresses(
  fids: string[],
): Promise<Map<string, string>> {
  const addressMap = new Map<string, string>();

  if (fids.length === 0) {
    return addressMap;
  }

  const BATCH_SIZE = 100; // Farcaster API batch limit
  const batches: string[][] = [];

  // Split FIDs into batches
  for (let i = 0; i < fids.length; i += BATCH_SIZE) {
    batches.push(fids.slice(i, i + BATCH_SIZE));
  }

  // Process each batch
  for (const batch of batches) {
    try {
      const fidsString = batch.join(",");
      const url = `https://api.warpcast.com/fc/primary-addresses?fids=${fidsString}&protocol=ethereum`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch addresses for batch: ${response.statusText}`,
        );
        continue;
      }

      const data = await response.json();

      if (data?.result?.addresses) {
        for (const addr of data.result.addresses) {
          if (addr.success && addr.address?.address && addr.address?.fid) {
            addressMap.set(addr.address.fid.toString(), addr.address.address);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching addresses for batch:`, error);
    }
  }

  return addressMap;
}

// Convert leaderboard data to CSV format
function convertToCSV(data: any[], includeAddress: boolean): string {
  if (data.length === 0) {
    return "No data available";
  }

  // Define CSV headers
  const headers = [
    "Rank",
    "Date",
    "User ID (FID)",
    "User Name",
    includeAddress ? "Wallet Address" : null,
    "Game Type",
    "Score",
    "Time Taken (seconds)",
    "Created At",
  ].filter(Boolean);

  // Create CSV rows
  const rows = data.map((entry) => {
    const row = [
      entry.rank || "",
      entry.date || "",
      entry.userId || "",
      `"${(entry.userName || "").replace(/"/g, '""')}"`, // Escape quotes in names
    ];

    if (includeAddress) {
      row.push(entry.walletAddress || "");
    }

    row.push(
      entry.gameType || "",
      entry.score || "",
      entry.timeTaken || "",
      entry.createdAt || "",
    );

    return row;
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

export async function GET(request: Request) {
  try {
    // Verify authentication
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid password" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date-from");
    const dateTo = url.searchParams.get("date-to");
    const date = url.searchParams.get("date");
    const gameType = url.searchParams.get("gameType") || "all"; // "color-mixing", "finding", or "all"
    const includeAddress = url.searchParams.get("includeAddress") === "true"; // Include wallet addresses

    // Determine date range
    let startDate: string;
    let endDate: string;

    if (date) {
      // Single date query
      startDate = date;
      endDate = date;
    } else if (dateFrom && dateTo) {
      // Date range query
      startDate = dateFrom;
      endDate = dateTo;
    } else if (dateFrom) {
      // Only from date, use today as end date
      startDate = dateFrom;
      endDate = new Date().toISOString().split("T")[0];
    } else {
      // Default to today
      const today = new Date().toISOString().split("T")[0];
      startDate = today;
      endDate = today;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    // Build query conditions
    const conditions = [
      gte(leaderboard.date, startDate),
      lte(leaderboard.date, endDate),
    ];

    if (gameType !== "all") {
      conditions.push(eq(leaderboard.gameType, gameType));
    }

    // Query leaderboard data
    const leaderboardData = await db
      .select({
        userId: leaderboard.userId,
        userName: leaderboard.userName,
        date: leaderboard.date,
        gameType: leaderboard.gameType,
        score: leaderboard.score,
        timeTaken: leaderboard.timeTaken,
        rank: leaderboard.rank,
        createdAt: leaderboard.createdAt,
      })
      .from(leaderboard)
      .where(and(...conditions))
      .orderBy(
        asc(leaderboard.date),
        desc(leaderboard.score),
        asc(leaderboard.timeTaken),
      );

    // Fetch wallet addresses if requested
    let addressMap = new Map<string, string>();
    if (includeAddress) {
      const uniqueFids = [
        ...new Set(leaderboardData.map((entry) => entry.userId)),
      ];
      console.log(
        `Fetching wallet addresses for ${uniqueFids.length} users...`,
      );
      addressMap = await fetchFarcasterAddresses(uniqueFids);
      console.log(`Retrieved ${addressMap.size} wallet addresses`);
    }

    // Calculate ranks per day and game type if not already set
    const rankedData = leaderboardData.map((entry, index) => {
      // Find rank within the same date and game type
      const sameDay = leaderboardData.filter(
        (e) =>
          e.date === entry.date &&
          (gameType === "all" ? true : e.gameType === entry.gameType),
      );
      const sortedSameDay = sameDay.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score; // Higher score = better rank
        }
        return parseFloat(a.timeTaken) - parseFloat(b.timeTaken); // Lower time = better rank
      });
      const rank =
        sortedSameDay.findIndex(
          (e) => e.userId === entry.userId && e.gameType === entry.gameType,
        ) + 1;

      return {
        ...entry,
        rank,
        walletAddress: includeAddress
          ? addressMap.get(entry.userId) || ""
          : undefined,
        createdAt: entry.createdAt?.toISOString() || "",
      };
    });

    // Generate CSV
    const csv = convertToCSV(rankedData, includeAddress);

    // Return CSV response
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leaderboard_${startDate}_to_${endDate}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting leaderboard:", error);
    return NextResponse.json(
      {
        error: "Failed to export leaderboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
