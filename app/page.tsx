// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [credits, setCredits] = useState(0);
  const [points, setPoints] = useState(0);
  const [result, setResult] = useState<string[]>(["", "", ""]);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([
    { position: 0, spinning: false },
    { position: 0, spinning: false },
    { position: 0, spinning: false },
  ]);

  // **Separate Message States**
  // General Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Game Outcome States
  const [gameMessage, setGameMessage] = useState("");
  const [gameMessageType, setGameMessageType] = useState<"success" | "error" | "info">("info");

  const sanitizeUsername = (name: string) => {
    return name.replace(/[^a-zA-Z0-9_-]/g, "").trim();
  };

  const register = async () => {
    const sanitizedUsername = sanitizeUsername(registerUsername);
    if (!sanitizedUsername || !registerPassword) {
      setModalMessage("Please enter a valid username and password to register.");
      setModalVisible(true);
      return;
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: sanitizedUsername, password: registerPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setModalMessage("User registered successfully! Please log in.");
    } else {
      setModalMessage(data.error || "Registration failed.");
    }
    setModalVisible(true);
  };

  const login = async () => {
    const sanitizedUsername = sanitizeUsername(loginUsername);
    if (!sanitizedUsername || !loginPassword) {
      setModalMessage("Please enter your username and password to login.");
      setModalVisible(true);
      return;
    }
    const res = await signIn("credentials", {
      redirect: false,
      username: sanitizedUsername,
      password: loginPassword,
    });

    if (res?.error) {
      setModalMessage("Login failed. Please check your credentials.");
      setModalVisible(true);
    } else {
      setModalMessage("Login successful!");
      setModalVisible(true);
      fetchUserData();
    }
  };

  const fetchUserData = async () => {
    const res = await fetch("/api/user");
    const data = await res.json();
    if (res.ok) {
      setCredits(data.credits);
      setPoints(data.points);
    } else {
      setModalMessage(data.error || "Failed to fetch user data.");
      setModalVisible(true);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUserData();
    }
  }, [session]);

  const play = async () => {
    if (spinning) return;
    if (!session) {
      setModalMessage("Please log in before playing.");
      setModalVisible(true);
      return;
    }
    if (credits <= 0) {
      setModalMessage("No credits left. Please buy more credits.");
      setModalVisible(true);
      return;
    }
    setSpinning(true);

    // Deduct one credit immediately to reflect in UI
    setCredits((prevCredits) => prevCredits - 1);

    const res = await fetch("/api/play", {
      method: "POST",
    });
    const data = await res.json();
    if (data.error) {
      setModalMessage(data.error);
      setModalVisible(true);
      setSpinning(false);
      // Revert credit deduction in case of error
      setCredits((prevCredits) => prevCredits + 1);
      return;
    }

    const finalResult = data.result; // ["🍒", "💎", "🔔"]

    // Map finalResult to their indices in symbols array
    const finalPositions = finalResult.map((symbol) => symbols.indexOf(symbol));

    // Function to spin a single reel using requestAnimationFrame
    const spinReel = (index: number, finalPos: number) => {
      return new Promise<void>((resolve) => {
        const totalSymbols = symbols.length;
        const spinDuration = 2000 + index * 500; // Stagger spin duration for each reel
        const startTime = performance.now();
        const spinEndTime = startTime + spinDuration;

        const animate = (currentTime: number) => {
          if (currentTime >= spinEndTime) {
            setReels((prevReels) =>
              prevReels.map((reel, i) =>
                i === index ? { ...reel, position: finalPos, spinning: false } : reel
              )
            );
            resolve();
            return;
          }

          // Update position
          setReels((prevReels) =>
            prevReels.map((reel, i) =>
              i === index ? { ...reel, position: (reel.position + 1) % totalSymbols } : reel
            )
          );

          requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      });
    };

    // Start spinning all reels
    const spinPromises = reels.map((reel, index) => {
      setReels((prevReels) =>
        prevReels.map((r, i) => (i === index ? { ...r, spinning: true } : r))
      );
      return spinReel(index, finalPositions[index]);
    });

    // Wait for all reels to stop spinning
    await Promise.all(spinPromises);

    // Update result and user data
    setResult(finalResult);
    setPoints(data.points);
    setCredits(data.credits);

    // Determine the type of message based on pointsWon
    let message;
    let messageType: "success" | "error" | "info" = "info";
    if (data.pointsWon > 0) {
      if (data.pointsWon === 100) {
        message = `🎉 Mega Jackpot! You matched all three rare symbols and won ${data.pointsWon} points!`;
        messageType = "success";
      } else if (data.pointsWon === 50) {
        message = `🎉 Jackpot! You matched all three symbols and won ${data.pointsWon} points!`;
        messageType = "success";
      } else {
        message = `😊 You matched two symbols and won ${data.pointsWon} points!`;
        messageType = "info";
      }
    } else {
      message = "😞 No win this time. Try again!";
      messageType = "error";
    }
    setGameMessage(message);
    setGameMessageType(messageType);
    setSpinning(false);
  };

  const buyCredits = async () => {
    if (!session) {
      setModalMessage("Please log in before purchasing credits.");
      setModalVisible(true);
      return;
    }
    const res = await fetch("/api/buy-credits", {
      method: "POST",
    });
    const data = await res.json();
    if (data.error) {
      setModalMessage(data.error);
      setModalVisible(true);
    } else {
      setCredits(data.credits);
      setPoints(data.points);
      setModalMessage(
        `You bought 1 credit for 10 points.\nCredits: ${data.credits}, Points: ${data.points}`
      );
      setModalVisible(true);
    }
  };

  const symbols = [
    "🍒",
    "💎",
    "🔔",
    "🍋",
    "⭐",
    "7️⃣",
    "🍉",
    "🍇",
    "🍀",
    "🥇",
    "🌟",
    "🎲",
    "🍊",
    "🎰",
    "👑",
    "🎁",
    "💰",
    "🧲",
    "🔱",
    "💎",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-900 to-black flex flex-col items-center justify-center text-cyan-300 px-4">
      <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4">
        🎰 TOR 777 🎰
      </h1>
      {!session ? (
        <>
          {/* Registration Form */}
          <div className="bg-black bg-opacity-50 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl border border-cyan-500 max-w-md w-full mb-6">
            <h2 className="text-2xl sm:text-3xl mb-4">Register</h2>
            <input
              type="text"
              placeholder="Username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              className="bg-transparent p-3 rounded-xl text-cyan-300 placeholder-cyan-500 border border-cyan-500 w-full mb-4"
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="bg-transparent p-3 rounded-xl text-cyan-300 placeholder-cyan-500 border border-cyan-500 w-full mb-4"
            />
            <button
              onClick={register}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full w-full"
            >
              Register
            </button>
          </div>
          {/* Login Form */}
          <div className="bg-black bg-opacity-50 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl border border-cyan-500 max-w-md w-full">
            <h2 className="text-2xl sm:text-3xl mb-4">Login</h2>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="bg-transparent p-3 rounded-xl text-cyan-300 placeholder-cyan-500 border border-cyan-500 w-full mb-4"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="bg-transparent p-3 rounded-xl text-cyan-300 placeholder-cyan-500 border border-cyan-500 w-full mb-4"
            />
            <button
              onClick={login}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full w-full"
            >
              Login
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg sm:text-xl mb-8">Welcome, {session.user?.name}!</p>
          <div className="bg-black bg-opacity-50 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl border border-cyan-500 max-w-md w-full">
            <div className="flex flex-col sm:flex-row justify-center mb-6 sm:mb-8">
              <button
                onClick={play}
                className={`bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-full mx-0 sm:mx-2 mb-4 sm:mb-0 transition duration-300 text-2xl sm:text-3xl shadow-lg ${
                  spinning || credits <= 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={spinning || credits <= 0}
              >
                {spinning ? "Spinning..." : "Spin 🎰"}
              </button>
              <button
                onClick={buyCredits}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full mx-0 sm:mx-2 transition duration-300 text-2xl sm:text-3xl shadow-lg`}
              >
                Buy Credits 💰
              </button>
            </div>
            <div className="flex flex-col sm:flex-row justify-between text-lg sm:text-xl font-semibold mb-6 sm:mb-8">
              <p>Credits: {credits}</p>
              <p>Points: {points}</p>
            </div>
            <div className="flex justify-center items-center">
              <div className="flex space-x-4">
                {reels.map((reel, index) => (
                  <div
                    key={index}
                    className="w-24 h-24 sm:w-28 sm:h-28 bg-black bg-opacity-70 border border-cyan-500 mx-2 rounded-xl flex items-center justify-center text-5xl sm:text-6xl overflow-hidden relative"
                  >
                    <div
                      className={`absolute inset-0 transition-transform duration-100 ${
                        reels[index].spinning ? "ease-linear" : "ease-out"
                      }`}
                      style={{
                        transform: `translateY(-${reel.position * 100}%)`,
                      }}
                    >
                      {symbols.map((icon, i) => (
                        <div key={i} className="h-full flex items-center justify-center">
                          {icon}
                        </div>
                      ))}
                    </div>
                    {!reel.spinning && (result[index] || "❓")}
                  </div>
                ))}
              </div>
            </div>
            {/* Sign Out Button */}
            <button
              onClick={() => signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full mt-6 w-full"
            >
              Sign Out
            </button>
            {/* **Inline Game Message** */}
            {gameMessage && (
              <div
                className={`mt-4 p-4 rounded-lg text-center text-lg sm:text-xl font-semibold flex items-center justify-center space-x-2 ${
                  gameMessageType === "success"
                    ? "bg-green-500 text-white"
                    : gameMessageType === "error"
                    ? "bg-red-500 text-white"
                    : "bg-yellow-500 text-white"
                }`}
              >
                {gameMessageType === "success" && <span>✅</span>}
                {gameMessageType === "error" && <span>❌</span>}
                {gameMessageType === "info" && <span>ℹ️</span>}
                <span>{gameMessage}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* **Modal for General Messages** */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 p-6 rounded-xl text-center border border-cyan-500 max-w-sm w-full">
            <p className="text-lg sm:text-xl mb-4 whitespace-pre-wrap">{modalMessage}</p>
            <button
              onClick={() => setModalVisible(false)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-full"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Optional: Keyframe Animations */}
      {/* <style jsx>{`

      
        @keyframes spin {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100%);
          }
        }

        .reel-spin {
          animation: spin 2s ease-out forwards;
        }


      `}</style> */}
    </div>
  );
}
