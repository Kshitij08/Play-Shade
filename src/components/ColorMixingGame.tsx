"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useColorMixingGame } from "@/lib/useColorMixingGame";
import { useGameContext } from "@/lib/GameContext";
import { Slider } from "@/components/ui/slider";
import { useColorCanvas } from "@/lib/hooks/useColorCanvas";

interface ColorMixingGameProps {
  targetColor?: string | null;
  onScoreSubmit?: (
    score: number,
    timeTaken: number,
    actualTargetColor?: string,
    actualCapturedColor?: string,
  ) => void;
  isMultiplayer?: boolean;
  disabled?: boolean;
  mode?: "daily" | "practice";
  timeLimit?: number; // Time limit in seconds
  useCanvas?: boolean; // Use canvas version to prevent cheating
}

interface ColorSliderProps {
  value: number;
  onChange: (value: number) => void;
  colorHex: string;
  disabled?: boolean;
}

const ColorSlider = ({
  value,
  onChange,
  colorHex,
  disabled = false,
}: ColorSliderProps) => {
  return (
    <div className="flex items-center w-full gap-[30px]">
      <div className="relative w-[318px] h-[48px] flex items-center">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          max={100}
          min={0}
          step={1}
          disabled={disabled}
          className="w-full"
          thumbColor={colorHex}
          trackColor={colorHex}
        />
      </div>

      {/* Percentage Label */}
      <div className="text-[22px] font-hartone leading-[16px] tracking-[7.5%] text-black text-right min-w-[40px] transition-colors duration-150">
        {value}%
      </div>
    </div>
  );
};

export const ColorMixingGame = ({
  targetColor,
  onScoreSubmit,
  isMultiplayer = false,
  disabled = false,
  mode = "practice",
  timeLimit,
  useCanvas = false, // Keep original DOM version
}: ColorMixingGameProps = {}) => {
  const {
    state,
    targetColorHex,
    mixedColorHex,
    handleSliderChange,
    handleShadingChange,
    handleMix,
    getColorHex,
    initializeGame,
  } = useColorMixingGame({
    isMultiplayer,
    targetColor: targetColor || undefined,
    onScoreSubmit,
    mode,
  });

  const { canvasRef } = useColorCanvas({
    targetColorHex,
    mixedColorHex,
    targetColor,
  });

  // Local state for immediate visual feedback
  const [localSliderValues, setLocalSliderValues] = useState({
    color1: state.colorPercentages.color1.percentage,
    color2: state.colorPercentages.color2.percentage,
    distractor: state.colorPercentages.distractor.percentage,
    white: state.colorPercentages.white,
    black: state.colorPercentages.black,
  });

  // Update local state when game state changes (e.g., on reset)
  useEffect(() => {
    setLocalSliderValues({
      color1: state.colorPercentages.color1.percentage,
      color2: state.colorPercentages.color2.percentage,
      distractor: state.colorPercentages.distractor.percentage,
      white: state.colorPercentages.white,
      black: state.colorPercentages.black,
    });
  }, [
    state.colorPercentages.color1.percentage,
    state.colorPercentages.color2.percentage,
    state.colorPercentages.distractor.percentage,
    state.colorPercentages.white,
    state.colorPercentages.black,
  ]);

  const gameContext = useGameContext();

  useEffect(() => {
    if (targetColor) {
      initializeGame(targetColor, isMultiplayer);
    }
  }, [targetColor, isMultiplayer, initializeGame]);

  useEffect(() => {
    if (gameContext && state.timer !== undefined && gameContext.updateTimer) {
      gameContext.updateTimer(state.timer);
    }
  }, [state.timer, gameContext]);

  if (mode === "daily" && !targetColor) {
    return (
      <div className="flex flex-col items-center gap-[55px] w-full  mx-auto">
        {/* Target Color Display with Loading */}
        <div className="flex flex-col items-center gap-[17px] w-full">
          <canvas
            ref={canvasRef}
            className="w-full h-[68px] border border-black rounded-[12px] shadow-[0px_6px_0px_0px_rgba(0,0,0,1)]"
            style={{ width: "100%", height: "68px" }}
          />
          <div className="flex justify-between items-center w-[287px]">
            <div className="px-1">
              <div className="text-[14px] font-sintony font-bold leading-[16px] tracking-[-1%] text-black">
                Target colour
              </div>
            </div>
            <div className="text-[14px] font-sintony font-bold leading-[16px] tracking-[-1%] text-black">
              Your colour
            </div>
          </div>
        </div>

        {/* Disabled sliders during loading */}
        <div className="flex flex-col gap-[24px] w-full opacity-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center w-full gap-[30px]">
              <div className="relative w-[318px] h-[48px]">
                <div className="absolute top-[5px] w-[318px] h-[38px] bg-gray-200 border border-black rounded-[21px]" />
                <div className="absolute top-0 w-[48px] h-[48px] rounded-full border-[4px] border-black bg-gray-300" />
              </div>
              <div className="text-[22px] font-hartone leading-[16px] tracking-[7.5%] text-black text-right min-w-[40px]">
                0%
              </div>
            </div>
          ))}
        </div>

        {/* Disabled submit button */}
        <button
          disabled
          className="w-full h-[51px] bg-gray-300 border border-black rounded-[39px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] text-[30px] font-hartone leading-[33px] tracking-[7.5%] text-gray-500 flex items-center justify-center opacity-50 cursor-not-allowed"
        >
          SUBMIT
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-12 w-full  mx-auto">
      {/* Target and Your Color Display */}
      <div className="flex flex-col items-center gap-[17px] w-full">
        {/* Color Display - Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-[68px] border border-black rounded-[12px] shadow-[0px_6px_0px_0px_rgba(0,0,0,1)]"
          style={{ width: "100%", height: "68px" }}
        />

        {/* Labels */}
        <div className="flex justify-between items-center w-[287px]">
          <div className="px-1">
            <div className="text-[14px] font-sintony font-bold leading-[16px] tracking-[-1%] text-black">
              Target colour
            </div>
          </div>
          <div className="text-[14px] font-sintony font-bold leading-[16px] tracking-[-1%] text-black">
            Your colour
          </div>
        </div>
      </div>

      {/* Color Sliders */}
      <div className="flex flex-col gap-3 w-full">
        {/* Primary Color 1 */}
        <ColorSlider
          value={localSliderValues.color1}
          onChange={(value) => {
            setLocalSliderValues((prev) => ({ ...prev, color1: value }));
            handleSliderChange("color1", value);
          }}
          colorHex={getColorHex(
            state.colorPercentages.color1.color.r,
            state.colorPercentages.color1.color.g,
            state.colorPercentages.color1.color.b,
          )}
          disabled={disabled}
        />

        {/* Primary Color 2 */}
        <ColorSlider
          value={localSliderValues.color2}
          onChange={(value) => {
            setLocalSliderValues((prev) => ({ ...prev, color2: value }));
            handleSliderChange("color2", value);
          }}
          colorHex={getColorHex(
            state.colorPercentages.color2.color.r,
            state.colorPercentages.color2.color.g,
            state.colorPercentages.color2.color.b,
          )}
          disabled={disabled}
        />

        {/* Distractor Color */}
        <ColorSlider
          value={localSliderValues.distractor}
          onChange={(value) => {
            setLocalSliderValues((prev) => ({ ...prev, distractor: value }));
            handleSliderChange("distractor", value);
          }}
          colorHex={getColorHex(
            state.colorPercentages.distractor.color.r,
            state.colorPercentages.distractor.color.g,
            state.colorPercentages.distractor.color.b,
          )}
          disabled={disabled}
        />

        {/* White Shading */}
        <ColorSlider
          value={localSliderValues.white}
          onChange={(value) => {
            setLocalSliderValues((prev) => ({ ...prev, white: value }));
            handleShadingChange("white", value);
          }}
          colorHex="#FFFFFF"
          disabled={disabled}
        />

        {/* Black Shading */}
        <ColorSlider
          value={localSliderValues.black}
          onChange={(value) => {
            setLocalSliderValues((prev) => ({ ...prev, black: value }));
            handleShadingChange("black", value);
          }}
          colorHex="#000000"
          disabled={disabled}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={async () => {
          const attempt = await handleMix();
          console.log("Mix submitted:", attempt);
          if (attempt && onScoreSubmit) {
            const timeTaken = state.startTime
              ? Math.floor((Date.now() - state.startTime) / 1000)
              : 0;
            onScoreSubmit(
              attempt.finalScore,
              timeTaken,
              targetColorHex || targetColor || undefined,
              mixedColorHex,
            );
          }
        }}
        disabled={disabled || state.showResults}
        className={cn(
          "w-full h-[51px] bg-[#FFE254] border border-black rounded-[39px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]",
          "text-[30px] font-hartone leading-[33px] tracking-[7.5%] text-black",
          "flex items-center justify-center",
          "transition-all duration-150",
          "hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px]",
          "active:shadow-none active:translate-y-[4px]",
          (disabled || state.showResults) &&
            "opacity-50 cursor-not-allowed hover:shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0",
        )}
      >
        SUBMIT
      </button>
    </div>
  );
};
