import { NextRequest, NextResponse } from "next/server";
import {
  createPartyRound,
  getPartyRound,
  completePartyRound,
  getPartyRounds,
  getPartyRoom,
} from "@/db/queries";

// POST /api/party/rounds - Create a new round
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roomId,
      roundNumber,
      gameType,
      dennerId,
      dennerName,
      targetColor,
      guessTime,
    } = body;

    if (!roomId || !roundNumber || !gameType || !dennerId || !dennerName || !targetColor) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await getPartyRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const round = await createPartyRound({
      roomId,
      roundNumber,
      gameType,
      dennerId,
      dennerName,
      targetColor,
      guessTime: guessTime || room.guessTime,
    });

    return NextResponse.json({
      success: true,
      round: {
        id: round.id,
        roomId: round.roomId,
        roundNumber: round.roundNumber,
        gameType: round.gameType,
        dennerId: round.dennerId,
        dennerName: round.dennerName,
        targetColor: round.targetColor,
        guessTime: round.guessTime,
        startTime: round.startTime,
        endTime: round.endTime,
        isCompleted: round.isCompleted,
        playerResults: round.playerResults,
        createdAt: round.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating party round:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}

// GET /api/party/rounds?roomId=XXXXXX&roundNumber=1 - Get specific round or all rounds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const roundNumberParam = searchParams.get("roundNumber");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (roundNumberParam) {
      // Get specific round
      const roundNumber = parseInt(roundNumberParam);
      const round = await getPartyRound(roomId, roundNumber);
      
      if (!round) {
        return NextResponse.json(
          { error: "Round not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        round: {
          id: round.id,
          roomId: round.roomId,
          roundNumber: round.roundNumber,
          gameType: round.gameType,
          dennerId: round.dennerId,
          dennerName: round.dennerName,
          targetColor: round.targetColor,
          guessTime: round.guessTime,
          startTime: round.startTime,
          endTime: round.endTime,
          isCompleted: round.isCompleted,
          playerResults: round.playerResults,
          createdAt: round.createdAt,
        },
      });
    } else {
      // Get all rounds for room
      const rounds = await getPartyRounds(roomId);

      return NextResponse.json({
        success: true,
        rounds: rounds.map(round => ({
          id: round.id,
          roomId: round.roomId,
          roundNumber: round.roundNumber,
          gameType: round.gameType,
          dennerId: round.dennerId,
          dennerName: round.dennerName,
          targetColor: round.targetColor,
          guessTime: round.guessTime,
          startTime: round.startTime,
          endTime: round.endTime,
          isCompleted: round.isCompleted,
          playerResults: round.playerResults,
          createdAt: round.createdAt,
        })),
      });
    }
  } catch (error) {
    console.error("Error getting party rounds:", error);
    return NextResponse.json(
      { error: "Failed to get rounds" },
      { status: 500 }
    );
  }
}

// PUT /api/party/rounds - Complete a round
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, roundNumber, playerResults } = body;

    if (!roomId || !roundNumber) {
      return NextResponse.json(
        { error: "Room ID and round number are required" },
        { status: 400 }
      );
    }

    const round = await completePartyRound(roomId, roundNumber, playerResults || []);
    if (!round) {
      return NextResponse.json(
        { error: "Round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      round: {
        id: round.id,
        roomId: round.roomId,
        roundNumber: round.roundNumber,
        gameType: round.gameType,
        dennerId: round.dennerId,
        dennerName: round.dennerName,
        targetColor: round.targetColor,
        guessTime: round.guessTime,
        startTime: round.startTime,
        endTime: round.endTime,
        isCompleted: round.isCompleted,
        playerResults: round.playerResults,
        createdAt: round.createdAt,
      },
    });
  } catch (error) {
    console.error("Error completing party round:", error);
    return NextResponse.json(
      { error: "Failed to complete round" },
      { status: 500 }
    );
  }
}
