import { NextRequest, NextResponse } from "next/server";
import {
  savePartyScore,
  getPartyScores,
  getPartyLeaderboard,
  getPartyRound,
  updatePartyPlayer,
} from "@/db/queries";

// POST /api/party/scores - Submit a score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roomId,
      roundId,
      playerId,
      playerName,
      score,
      timeTaken,
      targetColor,
      capturedColor,
      similarity,
      gameType,
    } = body;

    if (!roomId || !roundId || !playerId || !playerName || score === undefined || !timeTaken || !targetColor || !gameType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save the score
    const partyScore = await savePartyScore({
      roomId,
      roundId,
      playerId,
      playerName,
      score,
      timeTaken,
      targetColor,
      capturedColor,
      similarity,
      gameType,
    });

    // Update player's session score and round scores
    const currentScores = await getPartyScores(roomId);
    const playerScores = currentScores.filter(s => s.playerId === playerId);
    const totalScore = playerScores.reduce((sum, s) => sum + s.score, 0);
    const sessionScore = playerScores.length > 0 ? Math.round((totalScore / playerScores.length) * 100) / 100 : 0; // Average score rounded to 2 decimals
    const roundScores = playerScores.map(s => s.score);
    const bestScore = Math.max(...playerScores.map(s => s.score), 0);

    await updatePartyPlayer(roomId, playerId, {
      sessionScore,
      roundScores,
      bestScore,
      attempts: playerScores.length,
    });

    return NextResponse.json({
      success: true,
      score: {
        id: partyScore.id,
        roomId: partyScore.roomId,
        roundId: partyScore.roundId,
        playerId: partyScore.playerId,
        playerName: partyScore.playerName,
        score: partyScore.score,
        timeTaken: parseFloat(partyScore.timeTaken),
        targetColor: partyScore.targetColor,
        capturedColor: partyScore.capturedColor,
        similarity: partyScore.similarity ? parseFloat(partyScore.similarity) : null,
        gameType: partyScore.gameType,
        submittedAt: partyScore.submittedAt,
      },
    });
  } catch (error) {
    console.error("Error saving party score:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}

// GET /api/party/scores?roomId=XXXXXX&roundId=1 - Get scores for room/round
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const roundIdParam = searchParams.get("roundId");
    const leaderboard = searchParams.get("leaderboard");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (leaderboard === "true") {
      // Get session leaderboard
      const leaderboardData = await getPartyLeaderboard(roomId);

      return NextResponse.json({
        success: true,
        leaderboard: leaderboardData,
      });
    } else {
      // Get scores for specific round or all rounds
      const roundId = roundIdParam ? parseInt(roundIdParam) : undefined;
      const scores = await getPartyScores(roomId, roundId);

      return NextResponse.json({
        success: true,
        scores: scores.map(score => ({
          id: score.id,
          roomId: score.roomId,
          roundId: score.roundId,
          playerId: score.playerId,
          playerName: score.playerName,
          score: score.score,
          timeTaken: parseFloat(score.timeTaken),
          targetColor: score.targetColor,
          capturedColor: score.capturedColor,
          similarity: score.similarity ? parseFloat(score.similarity) : null,
          gameType: score.gameType,
          submittedAt: score.submittedAt,
        })),
      });
    }
  } catch (error) {
    console.error("Error getting party scores:", error);
    return NextResponse.json(
      { error: "Failed to get scores" },
      { status: 500 }
    );
  }
}
