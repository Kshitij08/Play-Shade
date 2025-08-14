"use client";

import { useColorGame } from "@/lib/useColorGame";
import { ColorSDK } from "@/lib/color-sdk";
import { useState, useEffect, useMemo } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { GamePlayingScreen } from "./GamePlayingScreen";
import { ResultsScreen } from "./ResultsScreen";
import { StatsScreen } from "./StatsScreen";
import { GameHistoryScreen } from "./GameHistoryScreen";
import { RetroButton } from "./RetroUI";

type GameFlowState =
  | "welcome"
  | "playing"
  | "results"
  | "stats"
  | "history"
  | "practice";

const ColorGame = () => {
  const {
    gameState,
    lastResult,
    timer,
    isLoading,
    error,
    webcamReady,
    webcamRef,
    canvasRef,
    startGame,
    captureColor,
    resetGame,
    getAverageScore,
    getBestScore,
    getWorstScore,
    getTotalGames,
    getTotalPlayTime,
    handleWebcamReady,
    handleWebcamError,
    setNewTargetColor,
    startDailyMode,
    showResult,
    dailyColor,
  } = useColorGame();

  const [isMobile, setIsMobile] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [overrideState, setOverrideState] = useState<GameFlowState | null>(
    null,
  );

  // Mobile detection - only run on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Compute game flow state
  const computedGameFlowState = useMemo((): GameFlowState => {
    if (gameState.isPlaying) return "playing";
    if (lastResult) return "results";
    return "welcome";
  }, [gameState.isPlaying, lastResult]);

  const gameFlowState = overrideState || computedGameFlowState;

  const handleStartGame = () => {
    startGame();
  };

  const handleStartGameFromWelcome = () => {
    startGame();
    setOverrideState("playing");
  };

  const handleCaptureColor = () => {
    try {
      captureColor();
    } catch (error) {
      console.error("Error capturing color:", error);
    }
  };

  const handleResetGame = () => {
    resetGame();
    setOverrideState(null);
  };

  const handlePracticeMode = () => {
    setPracticeMode(!practiceMode);
    if (practiceMode) {
      resetGame();
      setOverrideState(null);
    } else {
      setOverrideState("practice");
    }
  };

  const handleShowStats = () => setOverrideState("stats");
  const handleShowHistory = () => setOverrideState("history");
  const handleBackToWelcome = () => {
    resetGame();
    setOverrideState(null);
  };

  // Placeholder functions for navigation to other game modes
  const startPartyMode = () => {
    // This would navigate to party mode page
    console.log("Navigate to party mode");
  };

  const startMixMode = () => {
    // This would navigate to mix mode page
    console.log("Navigate to mix mode");
  };

  // Utility functions
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "🎯 Perfect Match!";
    if (score >= 80) return "🌟 Excellent!";
    if (score >= 70) return "👍 Great Job!";
    if (score >= 60) return "😊 Good!";
    if (score >= 40) return "🤔 Close!";
    return "💪 Keep Trying!";
  };

  const getDifficultyLevel = (score: number) => {
    if (score >= 80) return { level: "EXPERT", color: "success" as const };
    if (score >= 60) return { level: "ADVANCED", color: "info" as const };
    if (score >= 40)
      return { level: "INTERMEDIATE", color: "warning" as const };
    return { level: "BEGINNER", color: "error" as const };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAccessibilityDescription = (color: string) => {
    const colorName = ColorSDK.getColorName(color);
    const rgb = ColorSDK.hexToRgb(color);
    return `${colorName} color (${rgb})`;
  };

  // Render screens
  switch (gameFlowState) {
    case "welcome":
      return (
        <WelcomeScreen
          onStartGame={handleStartGameFromWelcome}
          onShowStats={handleShowStats}
          onPracticeMode={handlePracticeMode}
          error={error}
          onDailyMode={async () => {
            try {
              await startDailyMode();
              setOverrideState("playing");
            } catch (error) {
              console.error("Failed to start daily mode:", error);
            }
          }}
          onPartyMode={startPartyMode}
          onMixMode={startMixMode}
        />
      );

    case "playing":
      return (
        <GamePlayingScreen
          targetColor={gameState.targetColor}
          timer={timer}
          isLoading={isLoading}
          onCaptureColor={handleCaptureColor}
          onBackToMenu={handleBackToWelcome}
          webcamRef={webcamRef}
          canvasRef={canvasRef}
          isMobile={isMobile}
          getAccessibilityDescription={getAccessibilityDescription}
          webcamReady={webcamReady}
          handleWebcamReady={handleWebcamReady}
          handleWebcamError={handleWebcamError}
          onStartGame={handleStartGame}
          practiceMode={practiceMode}
          onPracticeMode={handlePracticeMode}
          onShowStats={handleShowStats}
          onShowHistory={handleShowHistory}
          getBestScore={getBestScore}
          getAverageScore={getAverageScore}
          getTotalGames={getTotalGames}
          showResult={showResult}
          lastResult={lastResult}
          dailyMode={gameState.dailyMode}
          attempts={gameState.attempts}
          bestScore={gameState.bestScore}
        />
      );

    case "results":
      if (!lastResult) return null;
      return (
        <ResultsScreen
          lastResult={lastResult}
          onPlayAgain={handleStartGame}
          onResetGame={handleResetGame}
          onShowStats={handleShowStats}
          onShowHistory={handleShowHistory}
          onBackToMenu={handleBackToWelcome}
          getScoreColor={getScoreColor}
          getScoreMessage={getScoreMessage}
          getDifficultyLevel={getDifficultyLevel}
          getAccessibilityDescription={getAccessibilityDescription}
        />
      );

    case "stats":
      return <StatsScreen />;

    case "history":
      return <GameHistoryScreen />;

    case "practice":
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="font-mono text-3xl font-bold text-foreground mb-2">
                🎮 Practice Mode
              </h1>
              <p className="font-mono text-lg text-foreground-muted">
                Practice your color matching skills without a camera!
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              {gameState.isPlaying ? (
                <div className="text-center space-y-6">
                  <div>
                    <h2 className="font-mono text-xl font-bold mb-4">
                      Target Color
                    </h2>
                    <div
                      className="w-32 h-32 mx-auto rounded-lg border-4 border-black shadow-lg"
                      style={{ backgroundColor: gameState.targetColor }}
                    />
                    <p className="font-mono text-sm mt-2">
                      {gameState.targetColor}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <RetroButton
                      onClick={handleCaptureColor}
                      variant="primary"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? "🎯 Capturing..." : "🎯 Capture Color"}
                    </RetroButton>

                    <RetroButton
                      onClick={handleResetGame}
                      variant="secondary"
                      size="md"
                    >
                      🔄 New Game
                    </RetroButton>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div>
                    <h2 className="font-mono text-xl font-bold mb-4">
                      Target Color
                    </h2>
                    <div
                      className="w-32 h-32 mx-auto rounded-lg border-4 border-black shadow-lg"
                      style={{
                        backgroundColor: gameState.targetColor || "#ff0000",
                      }}
                    />
                    <p className="font-mono text-sm mt-2">
                      {gameState.targetColor || "#ff0000"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <RetroButton
                      onClick={handleStartGame}
                      variant="primary"
                      size="lg"
                    >
                      🚀 Start Practice Game
                    </RetroButton>

                    <RetroButton
                      onClick={() =>
                        setNewTargetColor(ColorSDK.generateRandomColor())
                      }
                      variant="secondary"
                      size="md"
                    >
                      🎲 New Color
                    </RetroButton>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <RetroButton
                onClick={handleBackToWelcome}
                variant="secondary"
                size="md"
              >
                ← Back to Welcome
              </RetroButton>
            </div>

            <div className="mt-6 text-center text-sm text-foreground-muted">
              <p>
                💡 In practice mode, you can visualize colors and practice your
                color recognition skills.
              </p>
              <p>
                🎯 Click "Start Practice Game" to begin, then "Capture Color" to
                simulate finding the target color.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">❓</div>
            <p className="font-mono text-lg text-foreground-muted mb-4">
              Something went wrong with the game flow
            </p>
            <button
              onClick={handleBackToWelcome}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Welcome
            </button>
          </div>
        </div>
      );
  }
};

export default ColorGame;
