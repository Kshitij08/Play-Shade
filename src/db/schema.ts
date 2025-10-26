import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  decimal,
  index,
  unique,
  jsonb,
  boolean,
  text,
} from "drizzle-orm/pg-core";

// Simplified daily attempts table - one attempt per user per day per game type
export const dailyAttempts = pgTable(
  "daily_attempts",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(), // Direct FID or user identifier
    userName: varchar("user_name", { length: 100 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
    gameType: varchar("game_type", { length: 20 })
      .notNull()
      .default("color-mixing"), // "color-mixing" or "finding"
    targetColor: varchar("target_color", { length: 50 }).notNull(),
    capturedColor: varchar("captured_color", { length: 50 }).notNull(),
    similarity: decimal("similarity", { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
    timeTaken: decimal("time_taken", { precision: 8, scale: 3 }).notNull(), // seconds with milliseconds
    timeScore: integer("time_score").notNull(),
    finalScore: integer("final_score").notNull(),
    streak: integer("streak").notNull().default(1), // Current streak when this attempt was made
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("daily_attempts_user_date_game_unique").on(
      table.userId,
      table.date,
      table.gameType,
    ),
    // OPTIMIZED INDEXES for better query performance
    index("daily_attempts_user_date_idx").on(table.userId, table.date), // For user history queries
    index("daily_attempts_user_created_idx").on(table.userId, table.createdAt), // For recent attempts
    index("daily_attempts_date_game_idx").on(table.date, table.gameType), // For daily stats
    index("daily_attempts_final_score_idx").on(table.finalScore), // For score-based queries
    index("daily_attempts_streak_idx").on(table.streak), // For streak queries
  ],
);

// Simplified leaderboard - just the best scores per day per game type
export const leaderboard = pgTable(
  "leaderboard",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(), // Direct FID or user identifier
    userName: varchar("user_name", { length: 100 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
    gameType: varchar("game_type", { length: 20 })
      .notNull()
      .default("color-mixing"), // "color-mixing" or "finding"
    score: integer("score").notNull(),
    timeTaken: decimal("time_taken", { precision: 8, scale: 3 })
      .notNull()
      .default("0"), // seconds with milliseconds
    rank: integer("rank"), // Daily rank
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("leaderboard_user_date_game_unique").on(
      table.userId,
      table.date,
      table.gameType,
    ),
    // OPTIMIZED INDEXES for better query performance
    index("leaderboard_date_game_score_time_idx").on(
      table.date,
      table.gameType,
      table.score,
      table.timeTaken,
    ), // Composite index for leaderboard queries
    index("leaderboard_user_date_game_idx").on(
      table.userId,
      table.date,
      table.gameType,
    ), // For user ranking queries
    index("leaderboard_date_idx").on(table.date), // For date-based queries
    index("leaderboard_score_idx").on(table.score), // For score-based sorting
  ],
);

// Notification details table for storing user notification preferences
export const notificationDetails = pgTable(
  "notification_details",
  {
    id: serial("id").primaryKey(),
    fid: integer("fid").notNull().unique(), // Farcaster ID
    notificationDetails: jsonb("notification_details").notNull(), // MiniAppNotificationDetails JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_details_fid_idx").on(table.fid), // For quick FID lookups
  ],
);

// Party mode tables for multiplayer games
export const partyRooms = pgTable(
  "party_rooms",
  {
    id: serial("id").primaryKey(),
    roomId: varchar("room_id", { length: 20 }).notNull().unique(), // 6-digit room code
    hostId: varchar("host_id", { length: 50 }).notNull(), // Socket ID of the host
    hostName: varchar("host_name", { length: 100 }).notNull(),
    maxPlayers: integer("max_players").notNull().default(4),
    maxRounds: integer("max_rounds").notNull().default(3),
    guessTime: integer("guess_time").notNull().default(30), // seconds
    currentRound: integer("current_round").notNull().default(0),
    gameState: varchar("game_state", { length: 20 })
      .notNull()
      .default("lobby"), // lobby, gameSelection, playing, roundFinished, sessionFinished
    gameType: varchar("game_type", { length: 20 }), // findColor, colorMixing
    targetColor: varchar("target_color", { length: 50 }),
    currentGuessTime: integer("current_guess_time").default(30),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    isActive: boolean("is_active").notNull().default(true),
    dennerRotation: jsonb("denner_rotation").default([]), // Array of player IDs
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("party_rooms_room_id_idx").on(table.roomId),
    index("party_rooms_host_id_idx").on(table.hostId),
    index("party_rooms_active_idx").on(table.isActive),
    index("party_rooms_created_idx").on(table.createdAt),
  ],
);

export const partyPlayers = pgTable(
  "party_players",
  {
    id: serial("id").primaryKey(),
    roomId: varchar("room_id", { length: 20 }).notNull(),
    playerId: varchar("player_id", { length: 50 }).notNull(), // Socket ID
    playerName: varchar("player_name", { length: 100 }).notNull(),
    score: integer("score").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    bestScore: integer("best_score").notNull().default(0),
    sessionScore: integer("session_score").notNull().default(0),
    roundScores: jsonb("round_scores").default([]), // Array of scores per round
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
  },
  (table) => [
    unique("party_players_room_player_unique").on(table.roomId, table.playerId),
    index("party_players_room_id_idx").on(table.roomId),
    index("party_players_player_id_idx").on(table.playerId),
    index("party_players_active_idx").on(table.isActive),
    index("party_players_session_score_idx").on(table.sessionScore),
  ],
);

export const partyRounds = pgTable(
  "party_rounds",
  {
    id: serial("id").primaryKey(),
    roomId: varchar("room_id", { length: 20 }).notNull(),
    roundNumber: integer("round_number").notNull(),
    gameType: varchar("game_type", { length: 20 }).notNull(), // findColor, colorMixing
    dennerId: varchar("denner_id", { length: 50 }).notNull(),
    dennerName: varchar("denner_name", { length: 100 }).notNull(),
    targetColor: varchar("target_color", { length: 50 }).notNull(),
    guessTime: integer("guess_time").notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    isCompleted: boolean("is_completed").notNull().default(false),
    playerResults: jsonb("player_results").default([]), // Array of player scores and attempts
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("party_rounds_room_round_unique").on(table.roomId, table.roundNumber),
    index("party_rounds_room_id_idx").on(table.roomId),
    index("party_rounds_denner_id_idx").on(table.dennerId),
    index("party_rounds_completed_idx").on(table.isCompleted),
    index("party_rounds_created_idx").on(table.createdAt),
  ],
);

export const partyScores = pgTable(
  "party_scores",
  {
    id: serial("id").primaryKey(),
    roomId: varchar("room_id", { length: 20 }).notNull(),
    roundId: integer("round_id").notNull(),
    playerId: varchar("player_id", { length: 50 }).notNull(),
    playerName: varchar("player_name", { length: 100 }).notNull(),
    score: integer("score").notNull(),
    timeTaken: decimal("time_taken", { precision: 8, scale: 3 }).notNull(),
    targetColor: varchar("target_color", { length: 50 }).notNull(),
    capturedColor: varchar("captured_color", { length: 50 }),
    similarity: decimal("similarity", { precision: 5, scale: 2 }),
    gameType: varchar("game_type", { length: 20 }).notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    unique("party_scores_round_player_unique").on(table.roundId, table.playerId),
    index("party_scores_room_id_idx").on(table.roomId),
    index("party_scores_round_id_idx").on(table.roundId),
    index("party_scores_player_id_idx").on(table.playerId),
    index("party_scores_score_idx").on(table.score),
    index("party_scores_submitted_idx").on(table.submittedAt),
  ],
);

// Export types for TypeScript
export type DailyAttempt = typeof dailyAttempts.$inferSelect;
export type NewDailyAttempt = typeof dailyAttempts.$inferInsert;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboard.$inferInsert;
export type NotificationDetails = typeof notificationDetails.$inferSelect;
export type NewNotificationDetails = typeof notificationDetails.$inferInsert;

// Party mode types
export type PartyRoom = typeof partyRooms.$inferSelect;
export type NewPartyRoom = typeof partyRooms.$inferInsert;
export type PartyPlayer = typeof partyPlayers.$inferSelect;
export type NewPartyPlayer = typeof partyPlayers.$inferInsert;
export type PartyRound = typeof partyRounds.$inferSelect;
export type NewPartyRound = typeof partyRounds.$inferInsert;
export type PartyScore = typeof partyScores.$inferSelect;
export type NewPartyScore = typeof partyScores.$inferInsert;
