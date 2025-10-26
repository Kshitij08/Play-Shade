import { NextRequest, NextResponse } from "next/server";
import { cleanupInactiveRooms, cleanupInactivePlayers } from "@/db/queries";

// POST /api/party/cleanup - Clean up inactive rooms and players
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomHours = 24, playerHours = 2 } = body;

    // Clean up inactive rooms (default: 24 hours old)
    const inactiveRooms = await cleanupInactiveRooms(roomHours);

    // Clean up inactive players (default: 2 hours old)
    const inactivePlayers = await cleanupInactivePlayers(playerHours);

    return NextResponse.json({
      success: true,
      cleaned: {
        rooms: inactiveRooms,
        players: inactivePlayers,
      },
      message: `Cleaned up ${inactiveRooms} inactive rooms and ${inactivePlayers} inactive players`,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: "Failed to cleanup inactive data" },
      { status: 500 }
    );
  }
}

// GET /api/party/cleanup - Get cleanup statistics (for monitoring)
export async function GET() {
  try {
    // This is a dry run to see what would be cleaned up
    const now = new Date();
    const roomCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const playerCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      cutoffs: {
        rooms: roomCutoff.toISOString(),
        players: playerCutoff.toISOString(),
      },
      message: "Use POST to perform actual cleanup",
    });
  } catch (error) {
    console.error("Error getting cleanup info:", error);
    return NextResponse.json(
      { error: "Failed to get cleanup information" },
      { status: 500 }
    );
  }
}
