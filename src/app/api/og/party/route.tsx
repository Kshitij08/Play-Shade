import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { parsePartyShareParams } from "@/lib/farcaster-share";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partyData = parsePartyShareParams(searchParams);

    if (!partyData) {
      return new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFE7",
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            <div style={{ marginBottom: 20 }}>🎨</div>
            <div>Invalid Party Share</div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    // Sort players by score for display
    const sortedPlayers = partyData.playerNames
      .map((name, index) => ({
        name,
        score: partyData.playerScores[index] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFE7",
            fontFamily: "system-ui",
            padding: "40px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#000",
                marginRight: "20px",
              }}
            >
              🎨 PARTY RESULTS
            </div>
          </div>

          {/* Room ID */}
          <div
            style={{
              fontSize: "24px",
              color: "#666",
              marginBottom: "40px",
            }}
          >
            Room: {partyData.roomId}
          </div>

          {/* Winner Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "#FFE254",
              border: "3px solid #000",
              borderRadius: "20px",
              padding: "30px",
              marginBottom: "30px",
              boxShadow: "0px 6px 0px 0px rgba(0, 0, 0, 1)",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#000",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              🏆 WINNER
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#000",
                marginBottom: "5px",
              }}
            >
              {partyData.winnerName}
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#F6881D",
              }}
            >
              {partyData.winnerScore.toFixed(1)}%
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#FFF",
                border: "2px solid #000",
                borderRadius: "15px",
                padding: "20px",
                minWidth: "120px",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "5px" }}>👥</div>
              <div style={{ fontSize: "18px", color: "#666" }}>Players</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#000" }}>
                {partyData.playerNames.length}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#FFF",
                border: "2px solid #000",
                borderRadius: "15px",
                padding: "20px",
                minWidth: "120px",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "5px" }}>🎯</div>
              <div style={{ fontSize: "18px", color: "#666" }}>Rounds</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#000" }}>
                {partyData.totalRounds}
              </div>
            </div>
          </div>

          {/* Top 3 Players */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            {sortedPlayers.slice(0, 3).map((player, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: index === 0 ? "#FFE254" : "#FFF",
                  border: "2px solid #000",
                  borderRadius: "10px",
                  padding: "15px",
                  minWidth: "150px",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "5px" }}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    color: "#000",
                    marginBottom: "5px",
                    textAlign: "center",
                  }}
                >
                  {player.name.length > 12 
                    ? player.name.substring(0, 12) + "..." 
                    : player.name}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#F6881D",
                  }}
                >
                  {player.score.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: "16px",
              color: "#666",
              textAlign: "center",
            }}
          >
            Hosted by {partyData.hostName} • Play Shade
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
