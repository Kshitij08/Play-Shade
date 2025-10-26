"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Crown,
  RefreshCw,
  AlertTriangle,
  Share2,
  Coins,
} from "lucide-react";
import { useMiniKitUser } from "@/lib/useMiniKitUser";
import { Rank1, Rank2, Rank3 } from "./icons";
import sdk from "@farcaster/miniapp-sdk";
import html2canvas from "html2canvas";
import { getMintCost, useMintNFT } from "@/lib/nft-contract";
import {
  generateLeaderboardShareUrl,
  type LeaderboardApiResponse,
} from "@/lib/farcaster-share";
import { SuccessDialog } from "./SuccessDialog";

// Using the typed interfaces from farcaster-share.ts

export const LeaderboardScreen = () => {
  const { getUserId, getUserName, isLoading: userLoading } = useMiniKitUser();
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<
    "all" | "color-mixing" | "finding"
  >("all");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const {
    mint,
    isPending: isMinting,
    address,
  } = useMintNFT({
    onSuccess: () => {
      setShowSuccessDialog(true);
    },
    onError: () => {
      alert("Failed to mint NFT. Please try again.");
    },
  });

  const userId = getUserId();

  useEffect(() => {
    if (userLoading) return;

    let isCancelled = false;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split("T")[0];
        const response = await fetch(
          `/api/leaderboard?date=${today}&userId=${encodeURIComponent(userId)}&gameType=${selectedGameType}`,
        );

        if (response.ok) {
          const data = (await response.json()) as LeaderboardApiResponse;
          if (!isCancelled) {
            setLeaderboardData(data);
          }
        } else {
          throw new Error("Failed to fetch leaderboard");
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        if (!isCancelled) {
          setError("Failed to load leaderboard");
          setLeaderboardData(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      isCancelled = true;
    };
  }, [userId, userLoading, selectedGameType]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleShare = async () => {
    if (!leaderboardData?.userRanking) return;

    try {
      const shareData = {
        rank: leaderboardData.userRanking.rank,
        score: leaderboardData.userRanking.score,
        userName: getUserName(),
        gameType: selectedGameType,
        date: new Date().toISOString().split("T")[0],
      };

      const shareUrl = generateLeaderboardShareUrl(shareData, leaderboardData);
      await sdk.actions.composeCast({
        text: `Check out the @playshadedotfun leaderboard! I'm ranked #${leaderboardData.userRanking.rank} with ${leaderboardData.userRanking.score}%! 🏆 Can you beat my score?`,
        embeds: [shareUrl],
      });
    } catch (error) {
      console.error("Error sharing leaderboard:", error);
      console.log("leaderboardData", leaderboardData);
      await sdk.actions.composeCast({
        text: `Check out the @playshadedotfun leaderboard! I'm ranked #${leaderboardData?.userRanking?.rank} with ${leaderboardData?.userRanking?.score}%! 🏆 Can you beat my score?`,
      });
    }
  };

  const handleMint = async () => {
    if (!leaderboardData?.userRanking) {
      return;
    }

    try {
      // Capture the entire leaderboard
      const leaderboardElement = document.getElementById(
        "leaderboard-container",
      );
      if (!leaderboardElement) {
        console.error("Leaderboard element not found");
        return;
      }

      // Take screenshot of the entire leaderboard
      const canvas = await html2canvas(leaderboardElement, {
        backgroundColor: "#FFFFE7",
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
      });

      // Convert canvas to base64
      const base64Image = canvas.toDataURL("image/png");

      // Prepare metadata for the leaderboard NFT
      const gameMetadata = {
        name: `Leaderboard Rank #${leaderboardData.userRanking.rank}`,
        description: `${getUserName()} achieved rank #${leaderboardData.userRanking.rank} with ${leaderboardData.userRanking.score}% score on the leaderboard!`,
        attributes: [
          {
            trait_type: "Rank",
            value: leaderboardData.userRanking.rank,
          },
          {
            trait_type: "Score",
            value: leaderboardData.userRanking.score,
          },
          {
            trait_type: "Game Type",
            value: selectedGameType,
          },
          {
            trait_type: "Date",
            value: new Date().toISOString().split("T")[0],
          },
          {
            trait_type: "Mode",
            value: "leaderboard",
          },
        ],
        external_url: "https://playshadedotfun.com",
        background_color: "FFFFE7",
      };

      // Get presigned URLs for direct upload to R2
      const presignedResponse = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "leaderboard",
          metadata: gameMetadata,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get presigned URLs");
      }

      const { imageUploadUrl, imageUrl, metadataUploadUrl, metadataUrl } =
        await presignedResponse.json();

      // Convert base64 to blob for upload
      const base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const imageBlob = new Blob([byteArray], { type: "image/png" });

      // Upload image directly to R2 using presigned URL
      const imageUploadResponse = await fetch(imageUploadUrl, {
        method: "PUT",
        body: imageBlob,
        headers: {
          "Content-Type": "image/png",
        },
      });

      if (!imageUploadResponse.ok) {
        throw new Error("Failed to upload image to R2");
      }

      // Upload metadata directly to R2 using presigned URL
      const metadataUploadResponse = await fetch(metadataUploadUrl, {
        method: "PUT",
        body: JSON.stringify(gameMetadata, null, 2),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!metadataUploadResponse.ok) {
        throw new Error("Failed to upload metadata to R2");
      }

      console.log("Leaderboard uploaded to R2 successfully!");
      console.log("Image URL:", imageUrl);
      console.log("Metadata URL:", metadataUrl);

      // Mint NFT with the metadata URL from R2
      await mint(metadataUrl, getMintCost());
    } catch (error) {
      console.error("Error minting leaderboard NFT:", error);
      alert("Failed to mint NFT. Please try again.");
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
  };

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

  if (error) {
    return (
      <div className="w-full flex-1 flex items-center justify-center px-8 py-4">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <h2 className="font-black text-2xl uppercase tracking-tighter mb-2">
            ERROR
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 border border-black rounded hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#FFFFE7] flex flex-col">
      {/* Header */}
      <h1 className="font-hartone text-[39.2px] uppercase tracking-wide font-normal text-black leading-[42px] text-center w-full mb-4">
        LEADERBOARD
      </h1>

      {/* Prize Pool Section */}
      <div className="mx-4 mb-6">
        <div className="bg-gradient-to-r from-[#FFE254] to-[#FFD700] border-2 border-black rounded-[12px] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-black rounded-full flex items-center justify-center">
                <Coins className="w-5 h-5 text-[#F6881D]" />
              </div>
              <div>
                <p className="font-hartone text-[14px] text-black uppercase tracking-wide">
                  PRIZE POOL
                </p>
                <p className="font-sintony text-[12px] text-black/70">
                  Weekly Rewards
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-hartone text-[18px] text-black font-bold">
                $50
              </p>
              <p className="font-sintony text-[12px] text-black/70">
                worth of $SHADES
              </p>
            </div>
          </div>
          
          {/* Reward Distribution */}
          <div className="mt-3 pt-3 border-t border-black/20">
            <div className="flex justify-between items-center text-[11px] font-sintony">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#FFD700] border border-black rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">1</span>
                </div>
                <span className="text-black">1st: $25</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#C0C0C0] border border-black rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">2</span>
                </div>
                <span className="text-black">2nd: $15</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#CD7F32] border border-black rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">3</span>
                </div>
                <span className="text-black">3rd: $10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full border-b border-[#DEDEC9]">
        <div className="flex">
          <button
            onClick={() => setSelectedGameType("all")}
            className={`flex-1 py-[10px] ${selectedGameType === "all" ? "border-b border-black" : ""}`}
          >
            <span
              className={`font-hartone font-extralight text-[16px] tracking-[7.5%] ${selectedGameType === "all" ? "text-black" : "text-[#A8A8A8]"}`}
            >
              All
            </span>
          </button>
          <button
            onClick={() => setSelectedGameType("color-mixing")}
            className={`flex-1 py-[10px] ${selectedGameType === "color-mixing" ? "border-b border-black" : ""}`}
          >
            <span
              className={`font-hartone font-extralight text-[16px] tracking-[7.5%] ${selectedGameType === "color-mixing" ? "text-black" : "text-[#A8A8A8]"}`}
            >
              Color mixing
            </span>
          </button>
          <button
            onClick={() => setSelectedGameType("finding")}
            className={`flex-1 py-[10px] ${selectedGameType === "finding" ? "border-b border-black" : ""}`}
          >
            <span
              className={`font-hartone font-extralight text-[16px] tracking-[7.5%] ${selectedGameType === "finding" ? "text-black" : "text-[#A8A8A8]"}`}
            >
              Finding colors
            </span>
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div
        id="leaderboard-container"
        className=" overflow-y-auto w-full pt-[16px]"
      >
        {userLoading || isLoading ? (
          <div className="w-full mx-auto flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
              <h2 className="font-hartone text-xl uppercase tracking-wide mb-2 text-black">
                LOADING LEADERBOARD
              </h2>
              <p className="text-sm text-gray-600 tracking-wider font-sintony">
                Fetching rankings...
              </p>
            </div>
          </div>
        ) : !leaderboardData || leaderboardData.leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-black" />
            <h3 className="text-xl font-hartone  mb-2 text-black font-extralight">
              No Rankings Yet
            </h3>
            <p className="text-gray-600 mb-4 font-sintony">
              Be the first to play today and claim the top spot!
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full mx-auto">
            {leaderboardData.leaderboard.map((player) => (
              <div
                key={`${player.rank}-${player.userName}`}
                className={`w-full overflow-hidden border border-black rounded-[9px] flex flex-col ${
                  player.isCurrentUser
                    ? "bg-[#FFE254]/50 border-[#FFD700] border-2"
                    : "bg-white/30"
                }`}
              >
                <div className="h-[50px] flex items-center pr-4">
                  {getRankIcon(player.rank)}
                  <div className="flex items-center grow justify-between pl-2">
                    <p className="font-sintony text-[12px] text-black tracking-[7.5%] ml-1">
                      {player.userName}
                    </p>

                    <p className="font-hartone text-[16px] text-black tracking-[7.5%] ml-auto">
                      {player.score}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Show user's rank if they're not in the displayed leaderboard */}
            {leaderboardData.userRanking &&
              !leaderboardData.leaderboard.some(
                (player) => player.isCurrentUser,
              ) && (
                <div className="w-full overflow-hidden border-2 border-[#FFD700] rounded-[9px] flex flex-col bg-[#FFE254]/50">
                  <div className="h-[50px] flex items-center pr-4">
                    {getRankIcon(leaderboardData.userRanking.rank.toString())}
                    <div className="flex items-center grow justify-between pl-2">
                      <p className="font-sintony text-[12px] text-black tracking-[7.5%] ml-1">
                        {leaderboardData.userRanking.userName} (You)
                      </p>

                      <p className="font-hartone text-[16px] text-black tracking-[7.5%] ml-auto">
                        {leaderboardData.userRanking.score}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Share/Mint buttons for current user */}
            {leaderboardData.userRanking &&
              (leaderboardData.leaderboard.some(
                (player) => player.isCurrentUser,
              ) ||
                !leaderboardData.leaderboard.some(
                  (player) => player.isCurrentUser,
                )) && (
                <div className="px-4 pb-3 flex gap-2">
                  <button
                    onClick={handleShare}
                    className="flex-1 h-[36px] bg-[#FFE254] border border-black rounded-[20px] flex items-center justify-center font-hartone text-[14px] font-normal text-black hover:bg-[#FFD700] transition-colors"
                    style={{
                      boxShadow: "0px 2px 0px 0px rgba(0, 0, 0, 1)",
                      letterSpacing: "7.5%",
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    SHARE LEADERBOARD
                  </button>
                  <button
                    onClick={handleMint}
                    className="flex-1 h-[36px] bg-[#4ECDC4] border border-black rounded-[20px] flex items-center justify-center font-hartone text-[14px] font-normal text-black hover:bg-[#3FB8B0] transition-colors"
                    style={{
                      boxShadow: "0px 2px 0px 0px rgba(0, 0, 0, 1)",
                      letterSpacing: "7.5%",
                    }}
                  >
                    <Coins className="w-4 h-4 mr-1" />
                    MINT LEADERBOARD
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
      <div className="h-4"></div>

      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        title="NFT Minted!"
        description="Your leaderboard has been successfully minted as an NFT! You can view it in your wallet."
      />
    </div>
  );
};
