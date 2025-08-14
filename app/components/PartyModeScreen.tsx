import {
  RetroButton,
  RetroCard,
  RetroColorSwatch,
  RetroTimer,
  RetroSpinner,
  RetroScoreDisplay,
  RetroBadge,
  TouchArea,
} from "./RetroUI";
import Webcam from "react-webcam";
import { useState } from "react";

interface PartyModeScreenProps {
  targetColor: string;
  timer: number;
  isLoading: boolean;
  onCaptureColor: () => void;
  onBackToMenu: () => void;
  webcamRef: React.RefObject<Webcam>;
  canvasRef: any;
  isMobile: boolean;
  getAccessibilityDescription: (color: string) => string;
  webcamReady: boolean;
  handleWebcamReady: () => void;
  handleWebcamError: (error: any) => void;
  onStartGame: () => void;
  onShowStats: () => void;
  onShowHistory: () => void;
  getBestScore: () => number;
  getAverageScore: () => number;
  getTotalGames: () => number;
  showResult: boolean;
  lastResult: any;
  attempts: number;
  bestScore: number;
  onSetCustomColor: (color: string) => void;
}

export const PartyModeScreen = ({
  targetColor,
  timer,
  isLoading,
  onCaptureColor,
  onBackToMenu,
  webcamRef,
  canvasRef,
  isMobile,
  getAccessibilityDescription,
  webcamReady,
  handleWebcamReady,
  handleWebcamError,
  onStartGame,
  onShowStats,
  onShowHistory,
  getBestScore,
  getAverageScore,
  getTotalGames,
  showResult,
  lastResult,
  attempts,
  bestScore,
  onSetCustomColor,
}: PartyModeScreenProps) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#ff0000");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleUserMedia = () => {
    setCameraError(null);
    handleWebcamReady();
  };

  const handleUserMediaError = (error: any) => {
    let message = "Camera initialization failed.";

    if (error.name === "NotAllowedError") {
      message = "Camera access denied. Please allow camera permissions and refresh the page.";
    } else if (error.name === "NotFoundError") {
      message = "No camera found on this device.";
    } else if (error.name === "NotReadableError") {
      message = "Camera is in use by another application. Please close other apps using the camera.";
    } else if (error.name === "OverconstrainedError") {
      message = "Camera doesn't support the required resolution. Please try a different camera.";
    } else if (error.name === "SecurityError") {
      message = "Camera access blocked for security reasons. Please check your browser settings.";
    }

    setCameraError(message);
    handleWebcamError(error);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  const handleSetCustomColor = () => {
    onSetCustomColor(customColor);
    setShowColorPicker(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-mono text-3xl md:text-4xl font-bold text-foreground mb-2">
            🎉 Party Mode!
          </h1>
          <p className="font-mono text-lg text-foreground-muted">
            {webcamReady
              ? "Host a party! One person gives a color, others hunt for it!"
              : "Setting up your camera..."}
          </p>
          <div className="mt-2">
            <span className="inline-block bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
              🎮 Party Game - Attempt {attempts + 1}
            </span>
            {bestScore > 0 && (
              <span className="ml-2 inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                🏆 Best: {bestScore}%
              </span>
            )}
          </div>
        </div>

        {/* Result Overlay */}
        {showResult && lastResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
              <h2 className="text-2xl font-bold mb-4">🎯 Your Result!</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Score:</span>
                  <span className={`text-2xl font-bold ${
                    lastResult.finalScore >= 80 ? 'text-green-600' :
                    lastResult.finalScore >= 60 ? 'text-yellow-600' :
                    lastResult.finalScore >= 40 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {lastResult.finalScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Time:</span>
                  <span>{Math.round(lastResult.timeTaken / 1000)}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Accuracy:</span>
                  <span>{Math.round(lastResult.colorAccuracy)}%</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    {lastResult.finalScore > bestScore 
                      ? "🎉 New best score!"
                      : "Keep trying to beat your best score!"
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    Attempt {attempts + 1} of unlimited
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <RetroButton
                  onClick={onStartGame}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  🚀 Try Again
                </RetroButton>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RetroCard title="Target Color">
            <div className="text-center space-y-4">
              <RetroColorSwatch
                color={targetColor}
                size="lg"
                showHex
                className="mx-auto"
              />
              <div className="font-mono text-sm text-foreground-muted">
                {getAccessibilityDescription(targetColor)}
              </div>

              <div className="space-y-2">
                <div className="font-mono text-sm font-bold text-foreground-muted">
                  Time:
                </div>
                <RetroTimer seconds={timer} />
              </div>

              <RetroButton
                onClick={onCaptureColor}
                variant="success"
                size="lg"
                className="w-full"
                disabled={isLoading || !webcamReady}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <RetroSpinner className="mr-2" />
                    Capturing...
                  </span>
                ) : !webcamReady ? (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">📷</span>
                    Camera Setting Up...
                  </span>
                ) : (
                  "📸 CAPTURE COLOR"
                )}
              </RetroButton>

              <div className="space-y-2">
                <RetroButton 
                  onClick={() => setShowColorPicker(!showColorPicker)} 
                  variant="secondary" 
                  size="md" 
                  className="w-full"
                >
                  🎨 Set Custom Color
                </RetroButton>

                {showColorPicker && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={handleCustomColorChange}
                        className="w-12 h-12 rounded border-2 border-gray-300"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={handleCustomColorChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                        placeholder="#ff0000"
                      />
                    </div>
                    <RetroButton
                      onClick={handleSetCustomColor}
                      variant="primary"
                      size="sm"
                      className="w-full"
                    >
                      Set This Color
                    </RetroButton>
                  </div>
                )}

                <div className="flex gap-2">
                  <RetroButton onClick={onShowStats} variant="secondary" size="sm" className="flex-1">
                    📊 Stats
                  </RetroButton>
                  <RetroButton onClick={onShowHistory} variant="secondary" size="sm" className="flex-1">
                    📜 History
                  </RetroButton>
                </div>
              </div>
            </div>
          </RetroCard>

          <RetroCard title="Camera View">
            <div className="text-center space-y-4">
              {!webcamReady && !cameraError && (
                <div className="space-y-3">
                  <div className="text-4xl">📷</div>
                  <p className="font-mono text-sm text-foreground-muted">
                    Initializing camera...
                  </p>
                </div>
              )}

              {webcamReady && <div className="text-4xl">✅</div>}

              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className={`w-full h-64 object-cover rounded-lg border-2 shadow-lg ${
                    webcamReady
                      ? "border-green-500"
                      : "border-gray-300 opacity-50"
                  }`}
                  videoConstraints={{
                    facingMode: "user", // Always front-facing for party mode
                    width: { ideal: 640, min: 320 },
                    height: { ideal: 480, min: 240 },
                    frameRate: { ideal: 30, min: 15 },
                  }}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                />

                {webcamReady && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-16 h-16 border-4 border-white rounded-full pointer-events-none shadow-lg animate-pulse" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-red-500 rounded-full" />
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      LIVE
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {webcamReady ? (
                  <>
                    <p className="font-mono text-sm text-green-600 font-bold">
                      Camera Ready!
                    </p>
                    <p className="font-mono text-sm text-foreground-muted">
                      Point the crosshair at the target color and capture!
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-sm text-foreground-muted">
                    Setting up camera...
                  </p>
                )}
              </div>

              {cameraError && (
                <div className="space-y-3">
                  <div className="text-4xl">❌</div>
                  <p className="font-mono text-sm text-red-600 font-bold">
                    Camera Error
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                    <p>{cameraError}</p>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    💡 You can still play in practice mode without a camera!
                  </p>
                </div>
              )}
            </div>
          </RetroCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <RetroScoreDisplay
            label="Best Score"
            score={getBestScore()}
            maxScore={getBestScore()}
          />
          <RetroScoreDisplay
            label="Average Score"
            score={getAverageScore()}
            maxScore={getAverageScore()}
          />
          <RetroScoreDisplay
            label="Games Played"
            score={getTotalGames()}
            maxScore={getTotalGames()}
          />
        </div>

        {/* Hidden canvas for color capture */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="text-center">
          <RetroButton onClick={onBackToMenu} variant="secondary" size="md">
            ← Back to Welcome
          </RetroButton>
        </div>
      </div>
    </div>
  );
};
