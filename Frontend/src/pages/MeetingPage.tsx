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
      // Check if we're in a secure context (HTTPS required for getUserMedia)
      if (!window.isSecureContext) {
        const errorMsg = "Media access requires a secure connection (HTTPS). Please ensure you're accessing the site over HTTPS.";
        console.error("Insecure context:", errorMsg);
        alert(errorMsg);
        throw new Error(errorMsg);
      }

      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Your browser doesn't support camera/microphone access. Please update your browser or use a modern browser like Chrome, Firefox, or Edge.";
        console.error("MediaDevices API not available");
        alert(errorMsg);
        throw new Error(errorMsg);
      }

      // Stop existing stream if any
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      console.log('📹 Requesting camera/mic permission...', { isVideoEnabled, isAudioEnabled });
      const constraints = {
        video: isVideoEnabled ? { width: 1280, height: 720 } : false,
        audio: isAudioEnabled ? { echoCancellation: true, noiseSuppression: true } : false,
      };
      console.log('🎯 Using constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Successfully obtained media stream:', {
        id: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      setLocalStream(stream);

      // Set video element source immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local audio to prevent echo
        localVideoRef.current.play().catch((err) => {
          console.error("Error playing local video:", err);
        });
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);

      let userFriendlyMessage = "Failed to access camera/microphone.";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          userFriendlyMessage += "\n\nPlease allow camera and microphone permissions in your browser and try again.";
        } else if (error.name === "NotFoundError") {
          userFriendlyMessage += "\n\nNo camera or microphone found. Please connect a camera/microphone and try again.";
        } else if (error.name === "NotReadableError") {
          userFriendlyMessage += "\n\nCamera/microphone is already in use by another application. Please close other apps and try again.";
        } else if (error.name === "OverconstrainedError") {
          userFriendlyMessage += "\n\nCamera/microphone doesn't support the requested settings. Please try different settings.";
        } else if (error.message.includes("secure connection") || error.message.includes("HTTPS")) {
          userFriendlyMessage += "\n\nMedia access requires HTTPS. Please ensure you're accessing the site over a secure connection.";
        } else {
          userFriendlyMessage += `\n\nError: ${error.message}`;
        }
      } else {
        userFriendlyMessage += "\n\nPlease check your browser permissions and try again.";
      }

      alert(userFriendlyMessage);
      throw error;
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
   * IMPORTANT: This should only be called AFTER localStream is available
   */
  const createPeerConnection = (userId: string) => {
    // Check if peer connection already exists
    if (peerConnectionsRef.current.has(userId)) {
      return peerConnectionsRef.current.get(userId);
    }

    if (!localStream) {
      console.error(`Cannot create peer connection for ${userId}: localStream not available`);
      return null;
    }

    console.log(`🎥 Creating peer connection for user: ${userId}`);
    const peerConnection = new RTCPeerConnection(rtcConfig);

    // CRITICAL: Add ALL local tracks BEFORE any signaling
    console.log(`🎵 Adding local tracks to peer connection for ${userId}:`, {
      videoTracks: localStream.getVideoTracks().length,
      audioTracks: localStream.getAudioTracks().length
    });

    localStream.getTracks().forEach((track) => {
      console.log(`Adding ${track.kind} track: ${track.label || 'unnamed'}`);
      peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(`📡 Received remote ${event.track.kind} track from ${userId}`);
      const remoteStream = event.streams[0];

      console.log(`Remote stream tracks:`, {
        video: remoteStream.getVideoTracks().length,
        audio: remoteStream.getAudioTracks().length
      });

      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, remoteStream);
        return newMap;
      });
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 Peer connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === "connected") {
        console.log("✅ WebRTC connected for " + userId);
      }
      if (peerConnection.connectionState === "failed") {
        console.log("❌ WebRTC connection failed for " + userId + ", restarting ICE");
        peerConnection.restartIce();
      }
    };

    // ICE state debugging
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE state with ${userId}:`, peerConnection.iceConnectionState);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`📤 Sending ICE candidate to ${userId}`);
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
    // Emit leave event to socket if in room
    if (socket && roomId) {
      socket.emit("leave-room", { roomId });
    }

    // Stop media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (error) {
        console.error("Error closing peer connection:", error);
      }
    });
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
  const toggleVideo = async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !isVideoEnabled;
      videoTrack.enabled = newState;
      setIsVideoEnabled(newState);

      // Update all peer connections
      peerConnectionsRef.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video");
        if (sender && sender.track) {
          sender.track.enabled = newState;
        }
      });

      // If enabling video and track was stopped, reinitialize
      if (newState && !videoTrack.enabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: isAudioEnabled ? { echoCancellation: true, noiseSuppression: true } : false,
          });
          
          const newVideoTrack = stream.getVideoTracks()[0];
          if (newVideoTrack && localStream) {
            const oldTrack = localStream.getVideoTracks()[0];
            localStream.removeTrack(oldTrack);
            localStream.addTrack(newVideoTrack);
            oldTrack.stop();

            // Replace track in all peer connections
            peerConnectionsRef.current.forEach((peerConnection) => {
              const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video");
              if (sender) {
                sender.replaceTrack(newVideoTrack);
              }
            });

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }
          }
        } catch (error) {
          console.error("Error reinitializing video:", error);
        }
      }
    }
  };

  /**
   * Toggle audio
   */
  const toggleAudio = async () => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !isAudioEnabled;
      audioTrack.enabled = newState;
      setIsAudioEnabled(newState);

      // Update all peer connections
      peerConnectionsRef.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "audio");
        if (sender && sender.track) {
          sender.track.enabled = newState;
        }
      });

      // Handle speech recognition for translation
      if (newState) {
        startSpeechRecognition();
      } else {
        stopSpeechRecognition();
      }

      // If enabling audio and track was stopped, reinitialize
      if (newState && !audioTrack.enabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: isVideoEnabled ? { width: 1280, height: 720 } : false,
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          
          const newAudioTrack = stream.getAudioTracks()[0];
          if (newAudioTrack && localStream) {
            const oldTrack = localStream.getAudioTracks()[0];
            localStream.removeTrack(oldTrack);
            localStream.addTrack(newAudioTrack);
            oldTrack.stop();

            // Replace track in all peer connections
            peerConnectionsRef.current.forEach((peerConnection) => {
              const sender = peerConnection.getSenders().find((s) => s.track?.kind === "audio");
              if (sender) {
                sender.replaceTrack(newAudioTrack);
              }
            });
          }
        } catch (error) {
          console.error("Error reinitializing audio:", error);
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

    socket.on("room-joined", async (data: { roomId: string; participants: Participant[] }) => {
      console.log("🏠 Room joined, participants:", data.participants);
      setParticipants(data.participants);

      // Check if translation is needed (if all participants speak same language, skip translation)
      const needsTranslation = data.participants.some(
        (p) => p.speakingLanguage !== listeningLanguage || p.listeningLanguage !== speakingLanguage
      );

      // Only initialize translation if needed
      if (needsTranslation) {
        initializeSpeechRecognition();
        initializeTTS();
        if (isAudioEnabled) {
          startSpeechRecognition();
        }
      }

      // CRITICAL: Create peer connections ONLY after localStream is confirmed available
      const createConnectionsWithExistingParticipants = async () => {
        if (!localStream) {
          console.log("⏳ Waiting for local stream before creating peer connections...");
          setTimeout(createConnectionsWithExistingParticipants, 200);
          return;
        }

        console.log("🎯 Local stream ready, creating peer connections for existing participants");

        const currentUserId = user?.id?.toString();

        for (const participant of data.participants) {
          const participantUserId = participant.userId?.toString();

          if (participantUserId && participantUserId !== currentUserId) {
            console.log(`🔗 Creating peer connection for existing participant: ${participantUserId}`);

            // Create peer connection (tracks are added inside this function)
            const peerConnection = createPeerConnection(participantUserId);

            if (peerConnection) {
              try {
                console.log(`📤 Creating offer for existing participant: ${participantUserId}`);
                const offer = await peerConnection.createOffer();
                console.log("📋 Offer created:", offer);

                await peerConnection.setLocalDescription(offer);
                console.log("📝 Local description set");

                socket.emit("offer", {
                  offer: peerConnection.localDescription,
                  targetUserId: participantUserId,
                  roomId,
                });
                console.log(`✅ Offer sent to existing participant: ${participantUserId}`);
              } catch (error) {
                console.error("❌ Error creating offer for existing participant:", error);
              }
            }
          }
        }
      };

      // Start immediately since localStream should already be available
      createConnectionsWithExistingParticipants();
    });

    socket.on("user-joined", async (data: Participant) => {
      console.log("👋 New user joined:", data);
      setParticipants((prev) => {
        // Avoid duplicates
        if (prev.find((p) => p.userId === data.userId)) {
          return prev;
        }
        return [...prev, data];
      });

      // For new users, we wait for them to send us an offer
      // We don't create our own peer connection until we receive their offer
      console.log(`📥 Waiting for offer from new user: ${data.userId}`);
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
      try {
        console.log(`📨 Received offer from ${data.fromUserId}`);

        // Create peer connection for the user who sent the offer
        const peerConnection = createPeerConnection(data.fromUserId);

        if (!peerConnection) {
          console.error("❌ Failed to create peer connection for offer");
          return;
        }

        // Check if remote description is already set
        if (peerConnection.remoteDescription) {
          console.log("⚠️ Remote description already set, skipping");
          return;
        }

        console.log("📝 Setting remote description from offer");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        console.log("📤 Creating answer");
        const answer = await peerConnection.createAnswer();
        console.log("📋 Answer created:", answer);

        console.log("📝 Setting local description");
        await peerConnection.setLocalDescription(answer);

        console.log("📤 Sending answer");
        socket.emit("answer", {
          answer: peerConnection.localDescription,
          targetUserId: data.fromUserId,
          roomId,
        });
        console.log(`✅ Answer sent to ${data.fromUserId}`);
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    });

    socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
      try {
        console.log(`📨 Received answer from ${data.fromUserId}`);
        const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
        if (peerConnection) {
          // Check if remote description is already set
          if (peerConnection.remoteDescription) {
            console.log("⚠️ Answer remote description already set, skipping");
            return;
          }
          console.log("📝 Setting remote description from answer");
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log(`✅ Answer processed from ${data.fromUserId}`);
        } else {
          console.error(`❌ No peer connection found for ${data.fromUserId}`);
        }
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    });

    socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
      try {
        console.log(`🧊 Received ICE candidate from ${data.fromUserId}`);
        const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
        if (peerConnection && data.candidate) {
          console.log("➕ Adding ICE candidate");
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log(`✅ ICE candidate added from ${data.fromUserId}`);
        } else {
          console.warn(`⚠️ No peer connection or candidate for ${data.fromUserId}`);
        }
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    });

    socket.on("translated-text", (data: {
      text: string;
      targetLanguage: string;
      fromUserId: string;
      fromUserName: string;
      needsTranslation?: boolean;
    }) => {
      // Only use TTS if translation was actually needed
      // If languages match, WebRTC audio will handle it directly
      if (data.needsTranslation !== false && data.targetLanguage === listeningLanguage) {
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

  // Update local video when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("🎥 Setting local video stream", {
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length
      });

      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true; // Always mute local video to prevent echo
      localVideoRef.current.playsInline = true; // Required for iOS
      localVideoRef.current.play().catch((err) => {
        console.error("❌ Error playing local video:", err);
      });
    }
  }, [localStream]);

  // Update remote videos when remoteStreams changes
  useEffect(() => {
    console.log("🎥 Updating remote videos for", remoteStreams.size, "participants");
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideosRef.current.get(userId);
      if (videoElement) {
        if (videoElement.srcObject !== stream) {
          console.log(`📺 Setting remote video for user ${userId}`, {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });

          videoElement.srcObject = stream;
          videoElement.muted = false; // Allow remote audio
          videoElement.playsInline = true; // Required for iOS
          videoElement.play().catch((err) => {
            console.error("❌ Error playing remote video for user", userId, ":", err);
          });
        }
      } else {
        console.warn(`⚠️ No video element found for user ${userId}`);
      }
    });
  }, [remoteStreams]);

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
        <div className={`relative rounded-lg overflow-hidden aspect-video ${theme === "dark" ? "bg-slate-900" : "bg-slate-200"}`}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ minHeight: "200px" }}
          />
          {(!isVideoEnabled || !localStream || localStream.getVideoTracks().length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <span className="text-white text-lg">
                {!localStream ? "📷 Connecting camera..." : (!isVideoEnabled ? "🎥 Video disabled" : "⚠️ No video track")}
              </span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
            {user?.name || "You"} (You)
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
          const participant = participants.find((p) => p.userId === userId);
          return (
            <div
              key={userId}
              className={`relative rounded-lg overflow-hidden aspect-video ${theme === "dark" ? "bg-slate-900" : "bg-slate-200"}`}
            >
              <video
                ref={(el) => {
                  if (el) {
                    remoteVideosRef.current.set(userId, el);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ minHeight: "200px" }}
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

