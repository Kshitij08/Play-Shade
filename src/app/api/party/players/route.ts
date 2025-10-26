import { NextRequest, NextResponse } from "next/server";
import {
  addPartyPlayer,
  getPartyPlayers,
  updatePartyPlayer,
  removePartyPlayer,
  getPartyRoom,
} from "@/db/queries";

// POST /api/party/players - Add player to room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, playerId, playerName } = body;

    if (!roomId || !playerId || !playerName) {
      return NextResponse.json(
        { error: "Room ID, player ID, and player name are required" },
        { status: 400 }
      );
    }

    // Check if room exists and is active
    const room = await getPartyRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: "Room not found or inactive" },
        { status: 404 }
      );
    }

    // Check if room is full
    const currentPlayers = await getPartyPlayers(roomId);
    if (currentPlayers.length >= room.maxPlayers) {
      return NextResponse.json(
        { error: "Room is full" },
        { status: 400 }
      );
    }

    const player = await addPartyPlayer({
      roomId,
      playerId,
      playerName,
    });

    return NextResponse.json({
      success: true,
      player: {
        id: player.playerId,
        name: player.playerName,
        score: player.score,
        attempts: player.attempts,
        bestScore: player.bestScore,
        sessionScore: player.sessionScore,
        roundScores: player.roundScores,
        joinedAt: player.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error adding party player:", error);
    return NextResponse.json(
      { error: "Failed to add player to room" },
      { status: 500 }
    );
  }
}

// GET /api/party/players?roomId=XXXXXX - Get players in room
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

    const players = await getPartyPlayers(roomId);

    return NextResponse.json({
      success: true,
      players: players.map(p => ({
        id: p.playerId,
        name: p.playerName,
        score: p.score,
        attempts: p.attempts,
        bestScore: p.bestScore,
        sessionScore: p.sessionScore,
        roundScores: p.roundScores,
        joinedAt: p.joinedAt,
        lastSeen: p.lastSeen,
      })),
    });
  } catch (error) {
    console.error("Error getting party players:", error);
    return NextResponse.json(
      { error: "Failed to get players" },
      { status: 500 }
    );
  }
}

// PUT /api/party/players - Update player data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, playerId, ...updates } = body;

    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: "Room ID and player ID are required" },
        { status: 400 }
      );
    }

    const player = await updatePartyPlayer(roomId, playerId, updates);
    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.playerId,
        name: player.playerName,
        score: player.score,
        attempts: player.attempts,
        bestScore: player.bestScore,
        sessionScore: player.sessionScore,
        roundScores: player.roundScores,
        lastSeen: player.lastSeen,
      },
    });
  } catch (error) {
    console.error("Error updating party player:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

// DELETE /api/party/players?roomId=XXXXXX&playerId=YYYYYY - Remove player from room
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const playerId = searchParams.get("playerId");

    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: "Room ID and player ID are required" },
        { status: 400 }
      );
    }

    await removePartyPlayer(roomId, playerId);

    return NextResponse.json({
      success: true,
      message: "Player removed from room successfully",
    });
  } catch (error) {
    console.error("Error removing party player:", error);
    return NextResponse.json(
      { error: "Failed to remove player from room" },
      { status: 500 }
    );
  }
}
