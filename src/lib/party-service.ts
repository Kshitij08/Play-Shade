/**
 * Party Service - Database integration layer for party mode
 * This service bridges Socket.IO events with database persistence
 */

import {
  createPartyRoom,
  getPartyRoom,
  updatePartyRoom,
  deactivatePartyRoom,
  addPartyPlayer,
  getPartyPlayers,
  updatePartyPlayer,
  removePartyPlayer,
  createPartyRound,
  getPartyRound,
  completePartyRound,
  getPartyRounds,
  savePartyScore,
  getPartyScores,
  getPartyLeaderboard,
} from "@/db/queries";

export interface GameInfo {
  roomId: string;
  dennerId: string;
  dennerName: string;
  targetColor: string;
  gameState: "lobby" | "gameSelection" | "playing" | "roundFinished" | "sessionFinished";
  gameType: "findColor" | "colorMixing" | null;
  currentRound: number;
  maxRounds: number;
  guessTime: number;
  currentGuessTime: number;
  startTime: number | null;
  endTime: number | null;
  playerCount: number;
  maxPlayers: number;
  minPlayers: number;
  players: Array<{
    id: string;
    name: string;
    score: number;
    attempts: number;
    bestScore: number;
    sessionScore: number;
    roundScores: number[];
    joinedAt: number;
  }>;
  roundResults: Array<{
    round: number;
    gameType: "findColor" | "colorMixing";
    denner: string;
    players: Array<{
      id: string;
      name: string;
      score: number;
      attempts: number;
    }>;
    timestamp: number;
  }>;
  sessionLeaderboard: Array<{
    rank: number;
    id: string;
    name: string;
    sessionScore: number;
    roundScores: number[];
  }>;
  dennerRotation: string[];
}

export class PartyService {
  // Room Management
  static async createRoom(
    hostId: string,
    hostName: string,
    targetColor: string,
    options?: {
      maxPlayers?: number;
      maxRounds?: number;
      guessTime?: number;
    }
  ): Promise<{ roomId: string; gameInfo: GameInfo }> {
    // Generate unique room ID
    let roomId: string;
    let attempts = 0;
    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingRoom = await getPartyRoom(roomId);
      if (!existingRoom) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error("Failed to generate unique room ID");
    }

    // Create room in database
    const room = await createPartyRoom({
      roomId,
      hostId,
      hostName,
      maxPlayers: options?.maxPlayers || 4,
      maxRounds: options?.maxRounds || 3,
      guessTime: options?.guessTime || 30,
    });

    // Add host as first player
    await addPartyPlayer({
      roomId,
      playerId: hostId,
      playerName: hostName,
    });

    // Update room with target color
    await updatePartyRoom(roomId, {
      targetColor,
      gameState: "lobby",
    });

    const gameInfo = await this.getGameInfo(roomId);
    return { roomId, gameInfo };
  }

  static async joinRoom(
    roomId: string,
    playerId: string,
    playerName: string
  ): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const currentPlayers = await getPartyPlayers(roomId);
    if (currentPlayers.length >= room.maxPlayers) {
      throw new Error("Room is full");
    }

    await addPartyPlayer({
      roomId,
      playerId,
      playerName,
    });

    return await this.getGameInfo(roomId);
  }

  static async leaveRoom(roomId: string, playerId: string): Promise<GameInfo | null> {
    const room = await getPartyRoom(roomId);
    if (!room) return null;

    await removePartyPlayer(roomId, playerId);

    // If host left, transfer to another player or deactivate room
    if (room.hostId === playerId) {
      const remainingPlayers = await getPartyPlayers(roomId);
      if (remainingPlayers.length > 0) {
        // Transfer host to first remaining player
        const newHost = remainingPlayers[0];
        await updatePartyRoom(roomId, {
          hostId: newHost.playerId,
          hostName: newHost.playerName,
          dennerRotation: [newHost.playerId, ...((room.dennerRotation as string[]) || []).filter(id => id !== playerId)],
        });
      } else {
        // No players left, deactivate room
        await deactivatePartyRoom(roomId);
        return null;
      }
    }

    return await this.getGameInfo(roomId);
  }

  // Game Flow
  static async selectGameType(
    roomId: string,
    gameType: "findColor" | "colorMixing"
  ): Promise<GameInfo> {
    await updatePartyRoom(roomId, {
      gameType,
      gameState: "gameSelection",
    });

    return await this.getGameInfo(roomId);
  }

  static async startRound(roomId: string): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const nextRound = room.currentRound + 1;

    // Create round in database
    await createPartyRound({
      roomId,
      roundNumber: nextRound,
      gameType: room.gameType || "colorMixing",
      dennerId: room.hostId,
      dennerName: room.hostName,
      targetColor: room.targetColor || "#ff0000",
      guessTime: room.guessTime,
    });

    // Update room state
    await updatePartyRoom(roomId, {
      currentRound: nextRound,
      gameState: "playing",
      startTime: new Date(),
      currentGuessTime: room.guessTime,
    });

    return await this.getGameInfo(roomId);
  }

  static async endRound(roomId: string): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Get round scores
    const round = await getPartyRound(roomId, room.currentRound);
    if (round) {
      const scores = await getPartyScores(roomId, round.id);
      const playerResults = scores.map(score => ({
        id: score.playerId,
        name: score.playerName,
        score: score.score,
        attempts: 1,
      }));

      await completePartyRound(roomId, room.currentRound, playerResults);
    }

    // Check if session is complete
    const gameState = room.currentRound >= room.maxRounds ? "sessionFinished" : "roundFinished";

    await updatePartyRoom(roomId, {
      gameState,
      endTime: gameState === "sessionFinished" ? new Date() : undefined,
    });

    return await this.getGameInfo(roomId);
  }

  static async continueSession(roomId: string): Promise<GameInfo> {
    await updatePartyRoom(roomId, {
      gameState: "gameSelection",
    });

    return await this.getGameInfo(roomId);
  }

  static async endSession(roomId: string): Promise<GameInfo> {
    await updatePartyRoom(roomId, {
      gameState: "sessionFinished",
      endTime: new Date(),
    });

    return await this.getGameInfo(roomId);
  }

  // Score Management
  static async submitScore(
    roomId: string,
    playerId: string,
    playerName: string,
    score: number,
    timeTaken: number,
    capturedColor?: string,
    similarity?: number
  ): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const round = await getPartyRound(roomId, room.currentRound);
    if (!round) {
      throw new Error("Current round not found");
    }

    // Save score to database
    await savePartyScore({
      roomId,
      roundId: round.id,
      playerId,
      playerName,
      score,
      timeTaken,
      targetColor: round.targetColor,
      capturedColor,
      similarity,
      gameType: round.gameType,
    });

    return await this.getGameInfo(roomId);
  }

  // Utility Methods
  static async getGameInfo(roomId: string): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const players = await getPartyPlayers(roomId);
    const rounds = await getPartyRounds(roomId);
    const leaderboard = await getPartyLeaderboard(roomId);

    // Convert database data to GameInfo format
    const gameInfo: GameInfo = {
      roomId: room.roomId,
      dennerId: room.hostId,
      dennerName: room.hostName,
      targetColor: room.targetColor || "#ff0000",
      gameState: room.gameState as GameInfo["gameState"],
      gameType: room.gameType as GameInfo["gameType"],
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      guessTime: room.guessTime,
      currentGuessTime: room.currentGuessTime || room.guessTime,
      startTime: room.startTime ? room.startTime.getTime() : null,
      endTime: room.endTime ? room.endTime.getTime() : null,
      playerCount: players.length,
      maxPlayers: room.maxPlayers,
      minPlayers: 2,
      players: players.map(p => ({
        id: p.playerId,
        name: p.playerName,
        score: p.score,
        attempts: p.attempts,
        bestScore: p.bestScore,
        sessionScore: p.sessionScore,
        roundScores: (p.roundScores as number[]) || [],
        joinedAt: p.joinedAt.getTime(),
      })),
      roundResults: rounds
        .filter(r => r.isCompleted)
        .map(r => ({
          round: r.roundNumber,
          gameType: r.gameType as "findColor" | "colorMixing",
          denner: r.dennerName,
          players: (r.playerResults as any[]) || [],
          timestamp: r.createdAt.getTime(),
        })),
      sessionLeaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        id: entry.playerId,
        name: entry.playerName,
        sessionScore: entry.sessionScore,
        roundScores: entry.roundScores,
      })),
      dennerRotation: (room.dennerRotation as string[]) || [room.hostId],
    };

    return gameInfo;
  }

  static async extendTime(roomId: string, additionalSeconds: number = 30): Promise<GameInfo> {
    const room = await getPartyRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const newGuessTime = (room.currentGuessTime || room.guessTime) + additionalSeconds;
    
    await updatePartyRoom(roomId, {
      currentGuessTime: newGuessTime,
    });

    return await this.getGameInfo(roomId);
  }

  static async setTargetColor(roomId: string, targetColor: string): Promise<GameInfo> {
    await updatePartyRoom(roomId, {
      targetColor,
    });

    return await this.getGameInfo(roomId);
  }

  // Cleanup
  static async cleanupInactiveData(): Promise<{ rooms: number; players: number }> {
    const { cleanupInactiveRooms, cleanupInactivePlayers } = await import("@/db/queries");
    
    const rooms = await cleanupInactiveRooms(24); // 24 hours
    const players = await cleanupInactivePlayers(2); // 2 hours

    return { rooms, players };
  }
}
