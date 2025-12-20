import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useSocket } from "../hooks/useSocket";
import { meetingAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Copy, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

// Supported languages for translation
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "bn", name: "Bengali" },
];

interface Participant {
  userId: string;
  name: string;
  speakingLanguage: string;
  listeningLanguage: string;
}

export const MeetingPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Room state
  const [roomId, setRoomId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Language preferences
  const [speakingLanguage, setSpeakingLanguage] = useState("en");
  const [listeningLanguage, setListeningLanguage] = useState("en");
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);

  // Media state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  /**
   * Initialize media stream (camera + microphone)
   */
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Failed to access camera/microphone. Please check permissions.");
    }
  };

  /**
   * Create a new meeting room
   */
  const handleCreateRoom = async () => {
    if (!speakingLanguage || !listeningLanguage) {
      alert("Please select speaking and listening languages");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const response = await meetingAPI.createRoom();
      const { room } = response.data;
      setRoomId(room.roomId);
      setPasscode(room.passcode);
      setShowLanguageSelection(false);
      await joinRoom(room.roomId, room.passcode);
    } catch (error: any) {
      console.error("Create room error:", error);
      alert(error.response?.data?.message || "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  /**
   * Join an existing room
   */
  const joinRoom = async (roomIdToJoin: string, passcodeToJoin: string) => {
    if (!socket || !isConnected) {
      alert("Socket not connected. Please wait...");
      return;
    }

    if (!speakingLanguage || !listeningLanguage) {
      alert("Please select speaking and listening languages");
      return;
    }

    setIsJoiningRoom(true);
    try {
      // Initialize media first
      await initializeMedia();

      // Join room via API
      await meetingAPI.joinRoom(roomIdToJoin, passcodeToJoin);

      // Join room via Socket.io
      socket.emit("join-room", {
        roomId: roomIdToJoin,
        passcode: passcodeToJoin,
        speakingLanguage,
        listeningLanguage,
      });

      setIsInRoom(true);
      setRoomId(roomIdToJoin);
      setPasscode(passcodeToJoin);
    } catch (error: any) {
      console.error("Join room error:", error);
      alert(error.response?.data?.message || "Failed to join room");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  /**
   * Handle join room button
   */
  const handleJoinRoom = async () => {
    if (!roomId || !passcode) {
      alert("Please enter room ID and passcode");
      return;
    }
    await joinRoom(roomId, passcode);
  };

  /**
   * Create peer connection for a remote user
   */
  const createPeerConnection = (userId: string) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, remoteStream);
        return newMap;
      });

      // Set video element source
      setTimeout(() => {
        const videoElement = remoteVideosRef.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = remoteStream;
        }
      }, 100);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          targetUserId: userId,
          roomId,
        });
      }
    };

    peerConnectionsRef.current.set(userId, peerConnection);
    return peerConnection;
  };

  /**
   * Initialize speech recognition for STT
   */
  const initializeSpeechRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = speakingLanguage === "en" ? "en-US" : `${speakingLanguage}-IN`;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");

      if (transcript && socket) {
        // Send transcribed text to server for translation
        socket.emit("transcribed-text", {
          text: transcript,
          roomId,
          timestamp: Date.now(),
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognitionRef.current = recognition;
  };

  /**
   * Initialize text-to-speech
   */
  const initializeTTS = () => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported");
      return;
    }
    synthesisRef.current = window.speechSynthesis;
  };

  /**
   * Start speech recognition
   */
  const startSpeechRecognition = () => {
    if (recognitionRef.current && isAudioEnabled) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  /**
   * Stop speech recognition
   */
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  /**
   * Speak translated text
   */
  const speakText = (text: string, language: string) => {
    if (!synthesisRef.current) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : `${language}-IN`;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    synthesisRef.current.speak(utterance);
  };

  /**
   * Leave meeting room
   */
  const handleLeaveRoom = () => {
    // Stop media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop speech recognition
    stopSpeechRecognition();

    // Cleanup
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsInRoom(false);
    setRoomId("");
    setPasscode("");
    setParticipants([]);
  };

  /**
   * Toggle video
   */
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  /**
   * Toggle audio
   */
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);

        if (!isAudioEnabled) {
          startSpeechRecognition();
        } else {
          stopSpeechRecognition();
        }
      }
    }
  };

  /**
   * Copy room ID to clipboard
   */
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  /**
   * Copy passcode to clipboard
   */
  const copyPasscode = () => {
    navigator.clipboard.writeText(passcode);
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("room-joined", (data: { roomId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      initializeSpeechRecognition();
      initializeTTS();
      if (isAudioEnabled) {
        startSpeechRecognition();
      }
    });

    socket.on("user-joined", (data: Participant) => {
      setParticipants((prev) => [...prev, data]);
      // Create peer connection for new user
      const peerConnection = createPeerConnection(data.userId);

      // Create offer
      peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit("offer", {
            offer: peerConnection.localDescription,
            targetUserId: data.userId,
            roomId,
          });
        });
    });

    socket.on("user-left", (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(data.userId);
      }
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    });

    socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; fromUserId: string }) => {
      const peerConnection = createPeerConnection(data.fromUserId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answer", {
        answer: peerConnection.localDescription,
        targetUserId: data.fromUserId,
        roomId,
      });
    });

    socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
      const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
      const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on("translated-text", (data: {
      text: string;
      targetLanguage: string;
      fromUserId: string;
      fromUserName: string;
    }) => {
      // Speak translated text if it's for this user
      if (data.targetLanguage === listeningLanguage) {
        speakText(data.text, data.targetLanguage);
      }
    });

    socket.on("room-error", (data: { message: string }) => {
      alert(data.message);
    });

    return () => {
      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("translated-text");
      socket.off("room-error");
    };
  }, [socket, roomId, listeningLanguage, isAudioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleLeaveRoom();
    };
  }, []);

  if (!isInRoom) {
    return (
      <div className={`min-h-screen p-6 ${theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"}`}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Join Meeting</h1>
          <p className="text-slate-400 mb-8">Enter room details or create a new meeting</p>

          {/* Language Selection */}
          {showLanguageSelection && (
            <Card className={`p-6 mb-6 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <h2 className="text-xl font-semibold mb-4">Select Languages</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Speaking Language</label>
                  <select
                    value={speakingLanguage}
                    onChange={(e) => setSpeakingLanguage(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                    }`}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Listening Language</label>
                  <select
                    value={listeningLanguage}
                    onChange={(e) => setListeningLanguage(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                    }`}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => setShowLanguageSelection(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleCreateRoom} disabled={isCreatingRoom}>
                  {isCreatingRoom ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </Card>
          )}

          {/* Join Room Form */}
          {!showLanguageSelection && (
            <Card className={`p-6 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room ID</label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter Room ID"
                    className={`w-full p-2 rounded-lg border ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Passcode</label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter Passcode"
                    className={`w-full p-2 rounded-lg border ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Speaking Language</label>
                    <select
                      value={speakingLanguage}
                      onChange={(e) => setSpeakingLanguage(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                      }`}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Listening Language</label>
                    <select
                      value={listeningLanguage}
                      onChange={(e) => setListeningLanguage(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                      }`}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleJoinRoom} disabled={isJoiningRoom || !isConnected} className="flex-1">
                    {isJoiningRoom ? "Joining..." : "Join Room"}
                  </Button>
                  <Button onClick={() => setShowLanguageSelection(true)} variant="outline">
                    Create Room
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"}`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Meeting Room: {roomId}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
              <span>Passcode: {passcode}</span>
              <button onClick={copyRoomId} className="hover:text-slate-200">
                <Copy className="w-4 h-4 inline mr-1" />
                Copy Room ID
              </button>
              <button onClick={copyPasscode} className="hover:text-slate-200">
                <Copy className="w-4 h-4 inline mr-1" />
                Copy Passcode
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{participants.length + 1} participants</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
        {/* Local Video */}
        <div className={`relative rounded-lg overflow-hidden ${theme === "dark" ? "bg-slate-900" : "bg-slate-200"}`}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
            {user?.name} (You)
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
          const participant = participants.find((p) => p.userId === userId);
          return (
            <div
              key={userId}
              className={`relative rounded-lg overflow-hidden ${theme === "dark" ? "bg-slate-900" : "bg-slate-200"}`}
            >
              <video
                ref={(el) => {
                  if (el) remoteVideosRef.current.set(userId, el);
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                {participant?.name || "Unknown"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className={`p-4 border-t ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            className="px-6 py-3"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            className="px-6 py-3"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button onClick={handleLeaveRoom} variant="destructive" className="px-6 py-3">
            <PhoneOff className="w-5 h-5" />
            Leave
          </Button>
        </div>
        <div className="mt-2 text-center text-sm text-slate-400">
          Speaking: {LANGUAGES.find((l) => l.code === speakingLanguage)?.name} | Listening:{" "}
          {LANGUAGES.find((l) => l.code === listeningLanguage)?.name}
        </div>
      </div>
    </div>
  );
};

