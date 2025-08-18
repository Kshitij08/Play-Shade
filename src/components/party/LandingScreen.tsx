"use client";

import { cn } from "@/lib/utils";
import { useMiniKitUser } from "@/lib/useMiniKitUser";

interface LandingScreenProps {
  onShowCreate: () => void;
  onShowJoin: () => void;
}
export const LandingScreen = ({
  onShowCreate,
  onShowJoin,
}: LandingScreenProps) => {
  const { getUserAvatar, getUserName } = useMiniKitUser();
  const pfpUrl = getUserAvatar();
  const username = getUserName();
  return (
    <div className="min-h-screen bg-[#FFFFE7] p-4 font-mono">
      <div className="w-full pt-8">
        {/* Header with title */}
        <div className="text-center mb-16">
          <h1 className="font-hartone font-extralight text-[39px] leading-[42px] text-black mb-2">
            PARTY MODE
          </h1>
          <p className="font-sintony text-[14px] leading-[16px] text-black">
            Play together with your friends
          </p>
        </div>

        {/* Central Circle with Character or PFP */}
        <div className="flex flex-col items-center mb-32">
          <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full border border-black flex items-center justify-center relative bg-white overflow-hidden">
            {pfpUrl ? (
              <img
                src={pfpUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl">🎨</span>
            )}
          </div>
          <div className="mt-4 text-center">
            <span className="font-sintony text-lg text-black break-all">
              {username}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onShowCreate}
            className="w-full h-16 sm:h-[68px] bg-[#FFE254] border border-black rounded-[39px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-hartone text-xl sm:text-[34px] leading-[37px] tracking-[2.55px] text-black transition-all duration-150 hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            CREATE ROOM
          </button>

          <button
            onClick={onShowJoin}
            className="w-full h-16 sm:h-[68px] bg-white border border-black rounded-[39px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-hartone text-xl sm:text-[34px] leading-[37px] tracking-[2.55px] text-black transition-all duration-150 hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            JOIN ROOM
          </button>
        </div>
      </div>
    </div>
  );
};
