"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { parsePartyShareParams, type PartyShareData } from "@/lib/farcaster-share";
import { Trophy, Users, Target, Clock } from "lucide-react";

export default function PartySharePage() {
  const searchParams = useSearchParams();
  const [partyData, setPartyData] = useState<PartyShareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = parsePartyShareParams(searchParams);
    setPartyData(data);
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!partyData) {
    return (
      <div className="min-h-screen bg-[#FFFFE7] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-hartone text-black mb-4">Invalid Share Link</h1>
          <p className="text-black font-sintony">This party share link appears to be invalid or corrupted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFE7] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[39px] leading-[42px] font-hartone text-black mb-2">
            PARTY RESULTS
          </h1>
          <p className="text-[14px] font-sintony text-black">
            Room: {partyData.roomId}
          </p>
        </div>

        {/* Winner Section */}
        <div className="bg-white border-2 border-black rounded-[21px] p-6 mb-6 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#FFD700] mr-2" />
            <h2 className="text-[24px] font-hartone text-black">WINNER</h2>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-hartone text-black mb-2">
              {partyData.winnerName}
            </p>
            <p className="text-[32px] font-hartone text-[#F6881D]">
              {partyData.winnerScore.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-white border-2 border-black rounded-[21px] p-6 mb-6 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-black" />
              <p className="text-[14px] font-sintony text-black">Players</p>
              <p className="text-[18px] font-hartone text-black">
                {partyData.playerNames.length}
              </p>
            </div>
            <div className="text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-black" />
              <p className="text-[14px] font-sintony text-black">Rounds</p>
              <p className="text-[18px] font-hartone text-black">
                {partyData.totalRounds}
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white border-2 border-black rounded-[21px] p-6 mb-6 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-[18px] font-hartone text-black mb-4 text-center">
            FINAL STANDINGS
          </h3>
          <div className="space-y-3">
            {partyData.playerNames.map((name, index) => {
              const score = partyData.playerScores[index] || 0;
              const isWinner = name === partyData.winnerName;
              
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isWinner 
                      ? "bg-[#FFE254] border-[#F6881D]" 
                      : "bg-[#F8F8F8] border-gray-300"
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-[16px] font-hartone text-black mr-3">
                      #{index + 1}
                    </span>
                    <span className="text-[14px] font-sintony text-black">
                      {name}
                    </span>
                    {isWinner && (
                      <Trophy className="w-4 h-4 text-[#FFD700] ml-2" />
                    )}
                  </div>
                  <span className="text-[16px] font-hartone text-black">
                    {score.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Info */}
        <div className="text-center mb-6">
          <p className="text-[12px] font-sintony text-black">
            Hosted by {partyData.hostName}
          </p>
          {partyData.date && (
            <p className="text-[10px] font-sintony text-gray-600">
              {partyData.date}
            </p>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-[14px] font-sintony text-black mb-4">
            Think you can do better? Join the fun!
          </p>
          <Link
            href="/"
            className="inline-block bg-[#FFE254] border border-black rounded-[39px] px-8 py-3 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] text-[18px] font-hartone text-black hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all duration-150"
          >
            PLAY NOW
          </Link>
        </div>
      </div>
    </div>
  );
}
