"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Rank1, Rank2, Rank3 } from "../icons";
import { Share2 } from "lucide-react";
import { useComposeCast } from "@coinbase/onchainkit/minikit";
import { generatePartyShareUrl, type PartyShareData } from "@/lib/farcaster-share";

interface SessionFinishedScreenProps {
  gameInfo: any;
  isCurrentUserDenner: boolean;
  onBackToLanding: () => void;
  showFinalLeaderboard: boolean;
  setShowFinalLeaderboard: (show: boolean) => void;
}

const getRankIcon = (rank: string) => {
  switch (rank) {
    case "1":
      return (
        <div className="w-[50px] h-[50px] bg-white border-r border-black rounded-[5px]  flex items-center justify-center">
          <Rank1 />
        </div>
      );
    case "2":
      return (
        <div className="w-[50px] h-[50px] bg-white border-r border-black rounded-[5px]  flex items-center justify-center">
          <Rank2 />
        </div>
      );
    case "3":
      return (
        <div className="w-[50px] h-[50px] bg-white border-r border-black rounded-[5px]  flex items-center justify-center">
          <Rank3 />
        </div>
      );
    default:
      return (
        <div className="w-[50px] h-[50px] bg-white border-r border-black rounded-[5px]  flex items-center justify-center">
          <div className="w-[23px] h-[23px] rounded-full bg-black/10 flex items-center justify-center">
            <p className="text-[10px] font-hartone text-black opacity-45">
              {rank}
            </p>
          </div>
        </div>
      );
  }
};

export const SessionFinishedScreen = ({
  gameInfo,
  isCurrentUserDenner,
  onBackToLanding,
  showFinalLeaderboard,
  setShowFinalLeaderboard,
}: SessionFinishedScreenProps) => {
  const { composeCast } = useComposeCast();
  
  const winner = gameInfo.players?.reduce((prev: any, current: any) =>
    (prev.sessionScore || 0) > (current.sessionScore || 0) ? prev : current,
  );

  const handleShare = async () => {
    try {
      // Sort players by session score for leaderboard
      const sortedPlayers = [...(gameInfo.players || [])].sort(
        (a, b) => (b.sessionScore || 0) - (a.sessionScore || 0)
      );

      const partyData: PartyShareData = {
        roomId: gameInfo.roomId,
        hostName: gameInfo.dennerName,
        playerNames: sortedPlayers.map(p => p.name),
        playerScores: sortedPlayers.map(p => p.sessionScore || 0),
        totalRounds: gameInfo.maxRounds,
        gameTypes: [], // Could be enhanced to track game types per round
        winnerName: winner?.name || "Unknown",
        winnerScore: winner?.sessionScore || 0,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };

      const shareUrl = generatePartyShareUrl(partyData);
      
      // Create cast text with player mentions
      const playerMentions = sortedPlayers
        .slice(0, 5) // Limit to first 5 players to avoid text length issues
        .map(p => `@${p.name}`)
        .join(" ");

      const castText = `🎉 Epic party game complete! ${winner?.name} won with ${(winner?.sessionScore || 0).toFixed(1)}% average! 🏆\n\n${playerMentions}\n\nThink you can do better? 🎨`;

      composeCast({
        text: castText,
        embeds: [shareUrl],
      });
    } catch (error) {
      console.error("Error sharing party results:", error);
      // Fallback cast without URL
      composeCast({
        text: `🎉 Just finished an epic party game! ${winner?.name} won with ${(winner?.sessionScore || 0).toFixed(1)}% average! 🏆 Join the fun at @playshadedotfun! 🎨`,
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-black rounded-[12px] shadow-[0px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        <h2 className="font-hartone text-[24px] leading-[26px] text-black mb-6 text-center">
          🎉 Session Complete!
        </h2>

        {winner && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFE254] border border-black flex items-center justify-center">
              <span className="font-hartone text-[24px] text-black">👑</span>
            </div>
            <h3 className="font-hartone text-[20px] text-black">
              {winner.name} Wins!
            </h3>
            <p className="font-sintony text-[16px] text-black">
              Final Score: {(winner.sessionScore || 0).toFixed(1)}% average
            </p>
          </div>
        )}

        <div className="text-center mb-6 space-y-3">
          <Button
            onClick={() => setShowFinalLeaderboard(true)}
            className="bg-[#FFE254] text-black border border-black hover:bg-yellow-300 font-hartone text-[18px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] w-full"
          >
            Final Leaderboard
          </Button>
          
          <Button
            onClick={handleShare}
            className="bg-[#4CAF50] text-white border border-black hover:bg-green-600 font-hartone text-[18px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] w-full flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share Results
          </Button>
        </div>

        <div className="text-center py-4">
          <p className="font-sintony text-[16px] text-black">
            Session ended! Waiting for host{" "}
            <strong>{gameInfo.dennerName}</strong>...
          </p>
          <button
            onClick={onBackToLanding}
            className="mt-4 h-[52px] px-8 bg-white border border-black rounded-[39px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-hartone text-[18px] leading-[20px] tracking-[1.35px] text-black transition-all duration-150 hover:shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            LEAVE PARTY
          </button>
        </div>
      </div>

      {/* Final Leaderboard Modal */}
      <Dialog
        open={showFinalLeaderboard}
        onOpenChange={setShowFinalLeaderboard}
      >
        <DialogContent className="bg-white border-2 border-black w-[80vw] mx-auto">
          <DialogHeader>
            <DialogTitle className="font-hartone text-[24px] text-black">
              Final Leaderboard
            </DialogTitle>
            <DialogDescription className="font-sintony text-black">
              Session results for all {gameInfo.maxRounds} rounds
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {gameInfo.players
              ?.sort((a: any, b: any) => (b.sessionScore || 0) - (a.sessionScore || 0))
              .map((player: any, index: number) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between border border-black rounded-lg ${
                    index === 0 ? "bg-[#FFE254]" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon((index + 1).toString())}
                    <span className="font-sintony text-[16px] text-black">
                      {player.name}
                    </span>
                  </div>
                  <span className="font-hartone text-[18px] text-black pr-3">
                    {(player.sessionScore || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
