import { db } from "./index";
import {
  dailyAttempts,
  leaderboard,
  notificationDetails,
  partyRooms,
  partyPlayers,
  partyRounds,
  partyScores,
  type NewDailyAttempt,
  type NewLeaderboardEntry,
  type NewNotificationDetails,
  type NewPartyRoom,
  type NewPartyPlayer,
  type NewPartyRound,
  type NewPartyScore,
  type PartyRoom,
  type PartyPlayer,
  type PartyRound,
  type PartyScore,
} from "./schema";
import { eq, desc, and, sql, asc, gt, lt, or, inArray } from "drizzle-orm";
import type { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";

export async function saveDailyAttempt(
  userId: string,
  userName: string,
  attemptData: {
    targetColor: string;
    capturedColor: string;
    similarity: number;
    timeTaken: number;
    timeScore: number;
    finalScore: number;
    streak: number;
    gameType?: string;
  },
  date?: string,
): Promise<number> {
  const attemptDate = date || new Date().toISOString().split("T")[0];

  const newAttempt: NewDailyAttempt = {
    userId,
    userName,
    date: attemptDate,
    gameType: attemptData.gameType || "color-mixing",
    targetColor: attemptData.targetColor,
    capturedColor: attemptData.capturedColor,
    similarity: attemptData.similarity.toString(),
    timeTaken: attemptData.timeTaken.toString(),
    timeScore: attemptData.timeScore,
    finalScore: attemptData.finalScore,
    streak: attemptData.streak,
  };

  const result = await db
    .insert(dailyAttempts)
    .values(newAttempt)
    .returning({ id: dailyAttempts.id });

  return result[0].id;
}

export async function submitToLeaderboard(
  userId: string,
  userName: string,
  score: number,
  timeTaken: number,
  gameType: string = "color-mixing",
  date?: string,
): Promise<{ updated: boolean }> {
  const leaderboardDate = date || new Date().toISOString().split("T")[0];

  const existingEntry = await db
    .select({ score: leaderboard.score })
    .from(leaderboard)
    .where(
      and(
        eq(leaderboard.userId, userId),
        eq(leaderboard.date, leaderboardDate),
        eq(leaderboard.gameType, gameType),
      ),
    )
    .limit(1);

  if (existingEntry.length > 0) {
    if (score > existingEntry[0].score) {
      await db
        .update(leaderboard)
        .set({
          score,
          userName,
          timeTaken: timeTaken.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leaderboard.userId, userId),
            eq(leaderboard.date, leaderboardDate),
            eq(leaderboard.gameType, gameType),
          ),
        );
      return { updated: true };
    }
    return { updated: false };
  }

  const newEntry: NewLeaderboardEntry = {
    userId,
    userName,
    date: leaderboardDate,
    gameType,
    score,
    timeTaken: timeTaken.toString(),
  };

  await db.insert(leaderboard).values(newEntry);
  return { updated: true };
}

export async function getLeaderboard(
  date: string,
  userId?: string,
  gameType: string = "all",
) {
  const whereConditions = [eq(leaderboard.date, date)];
  if (gameType !== "all") {
    whereConditions.push(eq(leaderboard.gameType, gameType));
  }

  const whereClause =
    whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

  const topScoresQuery = db
    .select({
      userId: leaderboard.userId,
      userName: leaderboard.userName,
      score: leaderboard.score,
      gameType: leaderboard.gameType,
      timeTaken: leaderboard.timeTaken,
    })
    .from(leaderboard)
    .where(whereClause)
    .orderBy(desc(leaderboard.score), asc(leaderboard.timeTaken))
    .limit(10);

  const topScores = await topScoresQuery;

  let userRanking = null;
  if (userId) {
    const userInTop10 = topScores.find((entry) => entry.userId === userId);

    if (userInTop10) {
      const rank = topScores.findIndex((entry) => entry.userId === userId) + 1;
      userRanking = {
        userId: userInTop10.userId,
        userName: userInTop10.userName,
        score: userInTop10.score,
        gameType: userInTop10.gameType,
        rank,
      };
    } else {
      const userRankingQuery = db
        .select({
          userId: leaderboard.userId,
          userName: leaderboard.userName,
          score: leaderboard.score,
          gameType: leaderboard.gameType,
          timeTaken: leaderboard.timeTaken,
        })
        .from(leaderboard)
        .where(
          gameType !== "all"
            ? and(
                eq(leaderboard.date, date),
                eq(leaderboard.userId, userId),
                eq(leaderboard.gameType, gameType),
              )
            : and(eq(leaderboard.date, date), eq(leaderboard.userId, userId)),
        )
        .limit(1);

      const userRankingResult = await userRankingQuery;
      if (userRankingResult.length > 0) {
        const userEntry = userRankingResult[0];

        // Calculate rank by counting how many players are better
        const rankQuery = db
          .select({
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(leaderboard)
          .where(
            gameType !== "all"
              ? and(
                  eq(leaderboard.date, date),
                  eq(leaderboard.gameType, gameType),
                  or(
                    gt(leaderboard.score, userEntry.score),
                    and(
                      eq(leaderboard.score, userEntry.score),
                      lt(leaderboard.timeTaken, userEntry.timeTaken),
                    ),
                  ),
                )
              : and(
                  eq(leaderboard.date, date),
                  or(
                    gt(leaderboard.score, userEntry.score),
                    and(
                      eq(leaderboard.score, userEntry.score),
                      lt(leaderboard.timeTaken, userEntry.timeTaken),
                    ),
                  ),
                ),
          );

        const rankResult = await rankQuery;
        const rank = Number(rankResult[0]?.count || 0) + 1;

        userRanking = {
          userId: userEntry.userId,
          userName: userEntry.userName,
          score: userEntry.score,
          gameType: userEntry.gameType,
          rank,
        };
      }
    }
  }

  return {
    topScores,
    userRanking,
  };
}

// Get user's game history
export async function getUserGameHistory(userId: string, limit: number = 20) {
  const history = await db
    .select({
      id: dailyAttempts.id,
      score: dailyAttempts.finalScore,
      timeTaken: dailyAttempts.timeTaken,
      targetColor: dailyAttempts.targetColor,
      capturedColor: dailyAttempts.capturedColor,
      similarity: dailyAttempts.similarity,
      date: dailyAttempts.date,
      gameMode: dailyAttempts.gameType,
    })
    .from(dailyAttempts)
    .where(eq(dailyAttempts.userId, userId))
    .orderBy(desc(dailyAttempts.createdAt))
    .limit(limit);

  let totalGames = 0;
  let bestScore = 0;
  let totalScore = 0;

  const processedHistory = history.map((h) => {
    totalGames++;
    const score = h.score;
    totalScore += score;
    if (score > bestScore) bestScore = score;

    return {
      ...h,
      similarity: parseFloat(h.similarity),
      timeTaken: parseFloat(h.timeTaken),
    };
  });

  const averageScore = totalGames > 0 ? totalScore / totalGames : 0;

  return {
    history: processedHistory,
    stats: {
      totalGames,
      bestScore,
      averageScore,
    },
  };
}

// Get current streak for a user
export async function getUserStreak(userId: string): Promise<number> {
  const latestAttempt = await db
    .select({
      streak: dailyAttempts.streak,
      date: dailyAttempts.date,
    })
    .from(dailyAttempts)
    .where(eq(dailyAttempts.userId, userId))
    .orderBy(desc(dailyAttempts.date))
    .limit(1);

  if (latestAttempt.length === 0) {
    return 0;
  }

  const { streak, date } = latestAttempt[0];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (date === today || date === yesterdayStr) {
    return streak;
  }

  return 0;
}

// Notification details functions
export async function getUserNotificationDetails(
  fid: number,
): Promise<MiniAppNotificationDetails | null> {
  const result = await db
    .select({ notificationDetails: notificationDetails.notificationDetails })
    .from(notificationDetails)
    .where(eq(notificationDetails.fid, fid))
    .limit(1);

  return result.length > 0
    ? (result[0].notificationDetails as MiniAppNotificationDetails)
    : null;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetailsData: MiniAppNotificationDetails,
): Promise<void> {
  const existing = await db
    .select({ id: notificationDetails.id })
    .from(notificationDetails)
    .where(eq(notificationDetails.fid, fid))
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(notificationDetails)
      .set({
        notificationDetails: notificationDetailsData,
        updatedAt: new Date(),
      })
      .where(eq(notificationDetails.fid, fid));
  } else {
    // Insert new record
    const newNotificationDetails: NewNotificationDetails = {
      fid,
      notificationDetails: notificationDetailsData,
    };
    await db.insert(notificationDetails).values(newNotificationDetails);
  }
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  await db.delete(notificationDetails).where(eq(notificationDetails.fid, fid));
}

export async function getAllNotificationTokens(): Promise<
  Array<{ fid: number; notificationDetails: MiniAppNotificationDetails }>
> {
  const result = await db
    .select({
      fid: notificationDetails.fid,
      notificationDetails: notificationDetails.notificationDetails,
    })
    .from(notificationDetails);

  return result.map((row) => ({
    fid: row.fid,
    notificationDetails: row.notificationDetails as MiniAppNotificationDetails,
  }));
}

// ============================================================================
// PARTY MODE DATABASE FUNCTIONS
// ============================================================================

// Room Management
export async function createPartyRoom(roomData: {
  roomId: string;
  hostId: string;
  hostName: string;
  maxPlayers?: number;
  maxRounds?: number;
  guessTime?: number;
}): Promise<PartyRoom> {
  const newRoom: NewPartyRoom = {
    roomId: roomData.roomId,
    hostId: roomData.hostId,
    hostName: roomData.hostName,
    maxPlayers: roomData.maxPlayers || 4,
    maxRounds: roomData.maxRounds || 3,
    guessTime: roomData.guessTime || 30,
    dennerRotation: [roomData.hostId], // Host starts as denner
  };

  const result = await db
    .insert(partyRooms)
    .values(newRoom)
    .returning();

  return result[0];
}

export async function getPartyRoom(roomId: string): Promise<PartyRoom | null> {
  const result = await db
    .select()
    .from(partyRooms)
    .where(and(eq(partyRooms.roomId, roomId), eq(partyRooms.isActive, true)))
    .limit(1);

  return result[0] || null;
}

export async function updatePartyRoom(
  roomId: string,
  updates: Partial<NewPartyRoom>
): Promise<PartyRoom | null> {
  const result = await db
    .update(partyRooms)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(partyRooms.roomId, roomId))
    .returning();

  return result[0] || null;
}

export async function deactivatePartyRoom(roomId: string): Promise<void> {
  await db
    .update(partyRooms)
    .set({ isActive: false, endTime: new Date(), updatedAt: new Date() })
    .where(eq(partyRooms.roomId, roomId));
}

// Player Management
export async function addPartyPlayer(playerData: {
  roomId: string;
  playerId: string;
  playerName: string;
}): Promise<PartyPlayer> {
  const newPlayer: NewPartyPlayer = {
    roomId: playerData.roomId,
    playerId: playerData.playerId,
    playerName: playerData.playerName,
  };

  const result = await db
    .insert(partyPlayers)
    .values(newPlayer)
    .onConflictDoUpdate({
      target: [partyPlayers.roomId, partyPlayers.playerId],
      set: {
        isActive: true,
        lastSeen: new Date(),
      },
    })
    .returning();

  return result[0];
}

export async function getPartyPlayers(roomId: string): Promise<PartyPlayer[]> {
  return await db
    .select()
    .from(partyPlayers)
    .where(and(eq(partyPlayers.roomId, roomId), eq(partyPlayers.isActive, true)))
    .orderBy(asc(partyPlayers.joinedAt));
}

export async function updatePartyPlayer(
  roomId: string,
  playerId: string,
  updates: Partial<NewPartyPlayer>
): Promise<PartyPlayer | null> {
  const result = await db
    .update(partyPlayers)
    .set({ ...updates, lastSeen: new Date() })
    .where(and(eq(partyPlayers.roomId, roomId), eq(partyPlayers.playerId, playerId)))
    .returning();

  return result[0] || null;
}

export async function removePartyPlayer(roomId: string, playerId: string): Promise<void> {
  await db
    .update(partyPlayers)
    .set({ isActive: false, lastSeen: new Date() })
    .where(and(eq(partyPlayers.roomId, roomId), eq(partyPlayers.playerId, playerId)));
}

// Round Management
export async function createPartyRound(roundData: {
  roomId: string;
  roundNumber: number;
  gameType: string;
  dennerId: string;
  dennerName: string;
  targetColor: string;
  guessTime: number;
}): Promise<PartyRound> {
  const newRound: NewPartyRound = {
    roomId: roundData.roomId,
    roundNumber: roundData.roundNumber,
    gameType: roundData.gameType,
    dennerId: roundData.dennerId,
    dennerName: roundData.dennerName,
    targetColor: roundData.targetColor,
    guessTime: roundData.guessTime,
    startTime: new Date(),
  };

  const result = await db
    .insert(partyRounds)
    .values(newRound)
    .returning();

  return result[0];
}

export async function getPartyRound(roomId: string, roundNumber: number): Promise<PartyRound | null> {
  const result = await db
    .select()
    .from(partyRounds)
    .where(and(eq(partyRounds.roomId, roomId), eq(partyRounds.roundNumber, roundNumber)))
    .limit(1);

  return result[0] || null;
}

export async function completePartyRound(
  roomId: string,
  roundNumber: number,
  playerResults: any[]
): Promise<PartyRound | null> {
  const result = await db
    .update(partyRounds)
    .set({
      isCompleted: true,
      endTime: new Date(),
      playerResults: playerResults,
    })
    .where(and(eq(partyRounds.roomId, roomId), eq(partyRounds.roundNumber, roundNumber)))
    .returning();

  return result[0] || null;
}

export async function getPartyRounds(roomId: string): Promise<PartyRound[]> {
  return await db
    .select()
    .from(partyRounds)
    .where(eq(partyRounds.roomId, roomId))
    .orderBy(asc(partyRounds.roundNumber));
}

// Score Management
export async function savePartyScore(scoreData: {
  roomId: string;
  roundId: number;
  playerId: string;
  playerName: string;
  score: number;
  timeTaken: number;
  targetColor: string;
  capturedColor?: string;
  similarity?: number;
  gameType: string;
}): Promise<PartyScore> {
  const newScore: NewPartyScore = {
    roomId: scoreData.roomId,
    roundId: scoreData.roundId,
    playerId: scoreData.playerId,
    playerName: scoreData.playerName,
    score: scoreData.score,
    timeTaken: scoreData.timeTaken.toString(),
    targetColor: scoreData.targetColor,
    capturedColor: scoreData.capturedColor,
    similarity: scoreData.similarity?.toString(),
    gameType: scoreData.gameType,
  };

  const result = await db
    .insert(partyScores)
    .values(newScore)
    .onConflictDoUpdate({
      target: [partyScores.roundId, partyScores.playerId],
      set: {
        score: newScore.score,
        timeTaken: newScore.timeTaken,
        capturedColor: newScore.capturedColor,
        similarity: newScore.similarity,
        submittedAt: new Date(),
      },
    })
    .returning();

  return result[0];
}

export async function getPartyScores(roomId: string, roundId?: number): Promise<PartyScore[]> {
  const whereConditions = [eq(partyScores.roomId, roomId)];
  
  if (roundId) {
    whereConditions.push(eq(partyScores.roundId, roundId));
  }

  return await db
    .select()
    .from(partyScores)
    .where(and(...whereConditions))
    .orderBy(desc(partyScores.score), asc(partyScores.timeTaken));
}

export async function getPartyLeaderboard(roomId: string): Promise<Array<{
  playerId: string;
  playerName: string;
  sessionScore: number;
  roundScores: number[];
  totalScore: number;
  averageScore: number;
}>> {
  // Get all scores for the room
  const scores = await db
    .select()
    .from(partyScores)
    .where(eq(partyScores.roomId, roomId))
    .orderBy(asc(partyScores.roundId));

  // Group scores by player
  const playerScores = scores.reduce((acc, score) => {
    if (!acc[score.playerId]) {
      acc[score.playerId] = {
        playerId: score.playerId,
        playerName: score.playerName,
        scores: [],
      };
    }
    acc[score.playerId].scores.push(score.score);
    return acc;
  }, {} as Record<string, { playerId: string; playerName: string; scores: number[] }>);

  // Calculate leaderboard
  return Object.values(playerScores)
    .map(player => {
      const totalScore = player.scores.reduce((sum, score) => sum + score, 0);
      const averageScore = player.scores.length > 0 ? totalScore / player.scores.length : 0;
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        sessionScore: Math.round(averageScore * 100) / 100, // Use average as session score, rounded to 2 decimals
        roundScores: player.scores,
        totalScore: totalScore, // Keep total for reference
        averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore); // Sort by average score instead of total
}

// Cleanup functions
export async function cleanupInactiveRooms(hoursOld: number = 24): Promise<number> {
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  
  const result = await db
    .update(partyRooms)
    .set({ isActive: false })
    .where(and(
      eq(partyRooms.isActive, true),
      lt(partyRooms.updatedAt, cutoffTime)
    ))
    .returning({ id: partyRooms.id });

  return result.length;
}

export async function cleanupInactivePlayers(hoursOld: number = 2): Promise<number> {
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  
  const result = await db
    .update(partyPlayers)
    .set({ isActive: false })
    .where(and(
      eq(partyPlayers.isActive, true),
      lt(partyPlayers.lastSeen, cutoffTime)
    ))
    .returning({ id: partyPlayers.id });

  return result.length;
}
