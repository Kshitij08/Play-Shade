import { NextRequest, NextResponse } from "next/server";
import {
  createPartyRoom,
  getPartyRoom,
  updatePartyRoom,
  deactivatePartyRoom,
  getPartyPlayers,
} from "@/db/queries";

// Generate a 6-digit room code
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/party/rooms - Create a new party room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostId, hostName, maxPlayers, maxRounds, guessTime } = body;

    if (!hostId || !hostName) {
      return NextResponse.json(
        { error: "Host ID and name are required" },
        { status: 400 }
      );
    }

    // Generate unique room ID
    let roomId: string;
    let attempts = 0;
    do {
      roomId = generateRoomId();
      const existingRoom = await getPartyRoom(roomId);
      if (!existingRoom) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique room ID" },
        { status: 500 }
      );
    }

    const room = await createPartyRoom({
      roomId,
      hostId,
      hostName,
      maxPlayers: maxPlayers || 4,
      maxRounds: maxRounds || 3,
      guessTime: guessTime || 30,
    });

    return NextResponse.json({
      success: true,
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        hostName: room.hostName,
        maxPlayers: room.maxPlayers,
        maxRounds: room.maxRounds,
        guessTime: room.guessTime,
        currentRound: room.currentRound,
        gameState: room.gameState,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating party room:", error);
    return NextResponse.json(
      { error: "Failed to create party room" },
      { status: 500 }
    );
  }
}

// GET /api/party/rooms?roomId=XXXXXX - Get room information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const room = await getPartyRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Get current players
    const players = await getPartyPlayers(roomId);

    return NextResponse.json({
      success: true,
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        hostName: room.hostName,
        maxPlayers: room.maxPlayers,
        maxRounds: room.maxRounds,
        guessTime: room.guessTime,
        currentRound: room.currentRound,
        gameState: room.gameState,
        gameType: room.gameType,
        targetColor: room.targetColor,
        currentGuessTime: room.currentGuessTime,
        startTime: room.startTime,
        endTime: room.endTime,
        dennerRotation: room.dennerRotation,
        playerCount: players.length,
        players: players.map(p => ({
          id: p.playerId,
          name: p.playerName,
          score: p.score,
          attempts: p.attempts,
          bestScore: p.bestScore,
          sessionScore: p.sessionScore,
          roundScores: p.roundScores,
          joinedAt: p.joinedAt,
        })),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting party room:", error);
    return NextResponse.json(
      { error: "Failed to get party room" },
      { status: 500 }
    );
  }
}

// PUT /api/party/rooms - Update room state
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, ...updates } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const room = await updatePartyRoom(roomId, updates);
    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        hostName: room.hostName,
        maxPlayers: room.maxPlayers,
        maxRounds: room.maxRounds,
        guessTime: room.guessTime,
        currentRound: room.currentRound,
        gameState: room.gameState,
        gameType: room.gameType,
        targetColor: room.targetColor,
        currentGuessTime: room.currentGuessTime,
        startTime: room.startTime,
        endTime: room.endTime,
        dennerRotation: room.dennerRotation,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating party room:", error);
    return NextResponse.json(
      { error: "Failed to update party room" },
      { status: 500 }
    );
  }
}

// DELETE /api/party/rooms?roomId=XXXXXX - Deactivate room
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    await deactivatePartyRoom(roomId);

    return NextResponse.json({
      success: true,
      message: "Room deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating party room:", error);
    return NextResponse.json(
      { error: "Failed to deactivate party room" },
      { status: 500 }
    );
  }
}
