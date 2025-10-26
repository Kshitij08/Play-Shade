"use client";

import { useState, useEffect } from "react";
import { useSocket } from "../socket-provider";
import { FindColorGame } from "../FindColorGame";
import { ColorMixingGame } from "../ColorMixingGame";
import { LandingScreen } from "./LandingScreen";
import { CreateRoomForm } from "./CreateRoomForm";
import { JoinRoomForm } from "./JoinRoomForm";
import { GameLobby } from "./GameLobby";
import { RoundFinishedScreen } from "./RoundFinishedScreen";
import { SessionFinishedScreen } from "./SessionFinishedScreen";
import { GameSelectionScreen } from "./GameSelectionScreen";
import { RoundTransitionDialog } from "./RoundTransitionDialog";
import { GameSelectionDialog } from "./GameSelectionDialog";
import { LobbyDialog } from "./LobbyDialog";
import { TimerDisplay } from "@/lib/timer-utils";

export const MultiplayerPartyScreen = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // New dialog states
  const [showRoundTransitionDialog, setShowRoundTransitionDialog] =
    useState(false);
  const [showGameSelectionDialog, setShowGameSelectionDialog] = useState(false);
  const [showLobbyDialog, setShowLobbyDialog] = useState(false);

  // Room configuration state
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [guessTime, setGuessTime] = useState<number>(30);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Leaderboard modals
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);

  const {
    isConnected,
    error,
    currentRoom,
    gameInfo,
    events,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    selectGameType,
    startRound,
    endRound,
    continueSession,
    endSession,
    submitScore,
    extendTime,
    setTargetColor,
    clearEvents,
    clearError,
    isCurrentUserDenner,
  } = useSocket();

  const isUserDenner = isCurrentUserDenner();

  // Helper function to get the correct round number for dialog
  const getDialogRoundNumber = () => {
    if (!gameInfo) return 1;
    // For lobby state (first round), show round 1
    if (gameInfo.gameState === "lobby" || gameInfo.currentRound === 0) return 1;
    // For transitions between rounds, show next round
    return gameInfo.currentRound + 1;
  };

  // Auto-show lobby dialog when in lobby state
  useEffect(() => {
    if (gameInfo?.gameState === "lobby") {
      setShowLobbyDialog(true);
    }
  }, [gameInfo?.gameState]);

  // Also handle the transition back to lobby after rounds
  useEffect(() => {
    if (events && events.length > 0) {
      const latestEvent = events[events.length - 1];
      if (
        latestEvent.type === "dennerChanged" &&
        gameInfo?.gameState === "lobby"
      ) {
        setShowLobbyDialog(true);
      }
    }
  }, [events, gameInfo?.gameState]);

  useEffect(() => {
    connect();

    const retryConnection = () => {
      if (!isConnected) {
        console.log("Retrying socket connection...");
        connect();
      }
    };

    const retryTimer = setTimeout(retryConnection, 1000);

    return () => clearTimeout(retryTimer);
  }, [connect, isConnected]);

  // Handle socket events for notifications
  useEffect(() => {
    if (events && events.length > 0) {
      const latestEvent = events[events.length - 1];

      switch (latestEvent.type) {
        case "dennerChanged":
          const data = latestEvent.data as any;
          const reasonText =
            data.reason === "hostDisconnected"
              ? "disconnected"
              : data.reason === "hostLeft"
                ? "left the room"
                : "changed";

          console.log(
            `🔄 Host changed to ${data.dennerName} (previous host ${reasonText})`,
          );
          break;

        case "roomJoined":
        case "playerJoined":
          // Show lobby dialog when joining or when a player joins
          if (gameInfo?.gameState === "lobby") {
            setShowLobbyDialog(true);
          }
          const joinData = latestEvent.data as any;
          console.log(
            `👋 ${joinData.playerName || "A player"} joined the room`,
          );
          break;

        case "playerLeft":
          console.log(`👋 A player left the room`);
          break;

        case "roundStarted":
          const roundData = latestEvent.data as any;
          console.log(`🎮 Round ${roundData.gameInfo?.currentRound} started`);
          break;

        case "roundFinished":
          console.log(`🏁 Round finished`);
          // Show round transition dialog for round 1 or when user is denner
          if (gameInfo?.currentRound === 1 || isUserDenner) {
            setShowRoundTransitionDialog(true);
          }
          break;

        case "timeExtended":
          const timeData = latestEvent.data as any;
          console.log(
            `⏰ Time extended by ${timeData.additionalSeconds} seconds`,
          );
          // Extend the local timer
          setTimeLeft((prev) => (prev || 0) + timeData.additionalSeconds);
          break;
      }
    }
  }, [events, gameInfo?.currentRound, gameInfo?.gameState, isUserDenner]);

  // Timer effect for game countdown
  useEffect(() => {
    if (gameInfo?.gameState === "playing" && gameInfo?.guessTime) {
      // Initialize timer when game starts
      setTimeLeft(gameInfo.guessTime);

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(interval);
            // Timer expired - auto-submit score of 0
            if (currentRoom) {
              submitScore(currentRoom, 0, gameInfo.currentGuessTime);
            }
            return 0;
          }
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [gameInfo?.gameState, gameInfo?.guessTime, gameInfo?.currentGuessTime, currentRoom, submitScore]);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName, "#ff0000", {
        maxPlayers,
        maxRounds,
        guessTime,
      });
      setShowCreateForm(false);
      setShowLobbyDialog(true);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomId.trim()) {
      joinRoom(roomId, playerName);
      setShowJoinForm(false);
      setShowLobbyDialog(true);
    }
  };

  const handleGameTypeSelect = (gameType: "mix" | "find") => {
    if (currentRoom) {
      // For the first round in lobby, open the game selection dialog
      if (gameInfo?.gameState === "lobby") {
        setShowGameSelectionDialog(true);
      } else {
        // For other rounds, proceed directly
        const socketGameType = gameType === "mix" ? "colorMixing" : "findColor";
        selectGameType(currentRoom, socketGameType);
      }
    }
  };

  const handleContinueSession = () => {
    if (isUserDenner && currentRoom) {
      setShowRoundTransitionDialog(false);
      setShowGameSelectionDialog(true);
    }
  };

  const handleMoveToNext = () => {
    if (isUserDenner && currentRoom) {
      continueSession(currentRoom);
      setShowRoundTransitionDialog(false);
      setShowGameSelectionDialog(true);
    }
  };

  const handleDismissGame = () => {
    if (isUserDenner && currentRoom) {
      endSession(currentRoom);
      setShowRoundTransitionDialog(false);
    }
  };

  const handleGameTypeSelectFromDialog = (
    gameType: "findColor" | "colorMixing",
  ) => {
    if (currentRoom) {
      selectGameType(currentRoom, gameType);
      startRound(currentRoom);
      setShowGameSelectionDialog(false);
    }
  };

  const handleBackToLanding = () => {
    leaveRoom();
    setPlayerName("");
    setRoomId("");
    setShowJoinForm(false);
    setShowCreateForm(false);
    setShowQRCode(false);
    setShowLeaderboard(false);
    setShowFinalLeaderboard(false);
    setShowRoundTransitionDialog(false);
    setShowGameSelectionDialog(false);
    setShowLobbyDialog(false);
  };

  const getRoomShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${window.location.pathname}?roomId=${gameInfo?.roomId}`;
    }
    return "";
  };

  // Landing screen - show join/create buttons
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="font-sintony text-sm text-black">
            Connecting to server...
          </p>
          {error && (
            <p className="font-sintony text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (!gameInfo && !showJoinForm && !showCreateForm) {
    return (
      <LandingScreen
        onShowCreate={() => setShowCreateForm(true)}
        onShowJoin={() => setShowJoinForm(true)}
      />
    );
  }

  // Create room form
  if (showCreateForm) {
    return (
      <CreateRoomForm
        playerName={playerName}
        setPlayerName={setPlayerName}
        maxPlayers={maxPlayers}
        setMaxPlayers={setMaxPlayers}
        maxRounds={maxRounds}
        setMaxRounds={setMaxRounds}
        guessTime={guessTime}
        setGuessTime={setGuessTime}
        onCreateRoom={handleCreateRoom}
        onBack={() => setShowCreateForm(false)}
        showQRCode={showQRCode}
        setShowQRCode={setShowQRCode}
      />
    );
  }

  // Join room form
  if (showJoinForm) {
    return (
      <JoinRoomForm
        playerName={playerName}
        setPlayerName={setPlayerName}
        roomId={roomId}
        setRoomId={setRoomId}
        onJoinRoom={handleJoinRoom}
        onBack={() => setShowJoinForm(false)}
      />
    );
  }

  // Game states
  if (gameInfo) {
    // For lobby state, show lobby dialog on a simple background
    if (gameInfo.gameState === "lobby") {
      return (
        <>
          <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-hartone text-[32px] text-black mb-4">
                Room: {gameInfo.roomId}
              </h1>
              <p className="font-sintony text-[16px] text-black">
                Setting up the game...
              </p>
            </div>
          </div>

          {/* Lobby Dialog */}
          <LobbyDialog
            isOpen={showLobbyDialog}
            onClose={() => {}}
            gameInfo={gameInfo}
            isCurrentUserDenner={isUserDenner}
            onStartNextRound={() => {
              setShowLobbyDialog(false);
              setShowGameSelectionDialog(true);
            }}
            onEndSession={() => {
              if (currentRoom) {
                endSession(currentRoom);
                setShowLobbyDialog(false);
              }
            }}
            showQRCode={showQRCode}
            setShowQRCode={setShowQRCode}
            getRoomShareUrl={getRoomShareUrl}
          />

          {/* Game Selection Dialog */}
          {isUserDenner && (
            <GameSelectionDialog
              isOpen={showGameSelectionDialog}
              onClose={() => {}}
              roundNumber={getDialogRoundNumber()}
              onGameTypeSelect={handleGameTypeSelectFromDialog}
              onInvitePlayers={() => setShowQRCode(true)}
            />
          )}
        </>
      );
    }

    // Game selection state (between rounds) - show on simple background
    if (gameInfo.gameState === "gameSelection") {
      return (
        <>
          <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-hartone text-[32px] text-black mb-4">
                Room: {gameInfo.roomId}
              </h1>
              <p className="font-sintony text-[16px] text-black">
                Selecting game type...
              </p>
            </div>
          </div>

          <GameSelectionScreen
            gameInfo={gameInfo}
            isCurrentUserDenner={isUserDenner}
            onGameTypeSelect={handleGameTypeSelect}
          />
        </>
      );
    }

    // Playing state - main game screen with timer
    if (gameInfo.gameState === "playing") {
      return (
        <div className="min-h-screen bg-[#FFFFE7] w-full pb-8">
          {/* Room info header */}
          <div className="text-center mb-4">
            <h1 className="font-hartone text-[20px] text-black tracking-wider font-thin">
              Room: {gameInfo.roomId} • Round {gameInfo.currentRound}
            </h1>
          </div>

          {/* Timer display */}
          {timeLeft !== null && (
            <div className="text-center mb-6 flex gap-6 items-center">
              <TimerDisplay
                timeLeft={timeLeft}
                totalTime={gameInfo?.currentGuessTime || 30}
                urgencyLevel={
                  timeLeft <= 10
                    ? "critical"
                    : timeLeft <= 30
                      ? "warning"
                      : "normal"
                }
                showProgress={true}
                showUrgencyMessage={true}
              />

              {/* Denner timer controls */}
              {isUserDenner && timeLeft > 0 && (
                <div className="flex flex-col justify-center gap-2">
                  <button
                    onClick={() => {
                      if (currentRoom) {
                        extendTime(currentRoom, 30);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white border border-black rounded-lg shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] font-sintony text-[14px] transition-all duration-150"
                  >
                    +30s
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Game component */}
          {gameInfo.gameType === "findColor" ? (
            <FindColorGame
              targetColor={gameInfo.targetColor}
              timeLimit={gameInfo.guessTime}
              onScoreSubmit={(score, timeTaken) => {
                if (currentRoom) {
                  submitScore(currentRoom, score, timeTaken);
                }
              }}
            />
          ) : (
            <ColorMixingGame
              targetColor={gameInfo.targetColor}
              timeLimit={gameInfo.guessTime}
              onScoreSubmit={(score, timeTaken) => {
                if (currentRoom) {
                  submitScore(currentRoom, score, timeTaken);
                }
              }}
            />
          )}
        </div>
      );
    }

    // Round finished state - simple background with dialogs
    if (gameInfo.gameState === "roundFinished") {
      return (
        <>
          <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-hartone text-[32px] text-black mb-4">
                Round {gameInfo.currentRound} Complete!
              </h1>
              <p className="font-sintony text-[16px] text-black">
                Reviewing results...
              </p>
            </div>
          </div>

          {/* Round Transition Dialog */}
          <RoundTransitionDialog
            isOpen={showRoundTransitionDialog}
            onClose={() => setShowRoundTransitionDialog(false)}
            gameInfo={gameInfo}
            isCurrentUserDenner={isUserDenner}
            onMoveToNext={handleMoveToNext}
            onDismissGame={handleDismissGame}
          />

          {/* Game Selection Dialog */}
          <GameSelectionDialog
            isOpen={showGameSelectionDialog}
            onClose={() => setShowGameSelectionDialog(false)}
            roundNumber={getDialogRoundNumber()}
            onGameTypeSelect={handleGameTypeSelectFromDialog}
            onInvitePlayers={() => setShowQRCode(true)}
          />
        </>
      );
    }

    // Session finished state - simple background with dialogs
    if (gameInfo.gameState === "sessionFinished") {
      return (
        <>
          <div className=" bg-[#FFFFE7] flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-hartone text-[32px] text-black mb-4">
                Game Complete!
              </h1>
              <p className="font-sintony text-[16px] text-black">
                Final results ready...
              </p>
            </div>
          </div>

          <SessionFinishedScreen
            gameInfo={gameInfo}
            isCurrentUserDenner={isUserDenner}
            onBackToLanding={handleBackToLanding}
            showFinalLeaderboard={showFinalLeaderboard}
            setShowFinalLeaderboard={setShowFinalLeaderboard}
          />
        </>
      );
    }
  }

  // Fallback with dialogs
  return (
    <>
      <div className="min-h-screen bg-[#FFFFE7] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-black rounded-full border-t-transparent animate-spin"></div>
          <p className="font-sintony text-[16px] text-black">Connecting...</p>
        </div>
      </div>

      {/* Round Transition Dialog */}
      {gameInfo && (
        <RoundTransitionDialog
          isOpen={showRoundTransitionDialog}
          onClose={() => setShowRoundTransitionDialog(false)}
          gameInfo={gameInfo}
          isCurrentUserDenner={isUserDenner}
          onMoveToNext={handleMoveToNext}
          onDismissGame={handleDismissGame}
        />
      )}

      {/* Game Selection Dialog */}
      <GameSelectionDialog
        isOpen={showGameSelectionDialog}
        onClose={() => setShowGameSelectionDialog(false)}
        roundNumber={getDialogRoundNumber()}
        onGameTypeSelect={handleGameTypeSelectFromDialog}
        onInvitePlayers={() => setShowQRCode(true)}
      />
    </>
  );
};
