import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { joinMeetingRoom, leaveMeetingRoom, getRoomParticipants } from "./meetingService.js";
import { translatorAgent } from "../agents/translatorAgent.js";

/**
 * Socket.io service for WebRTC signaling and real-time translation
 */
export const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  // Store active rooms and their participants
  const activeRooms = new Map(); // roomId -> Set of socketIds
  const socketToRoom = new Map(); // socketId -> roomId
  const socketToUser = new Map(); // socketId -> { userId, speakingLanguage, listeningLanguage }

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user._id.toString();
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id})`);

    /**
     * Join a meeting room
     */
    socket.on("join-room", async ({ roomId, passcode, speakingLanguage, listeningLanguage }) => {
      try {
        // Validate language preferences
        if (!speakingLanguage || !listeningLanguage) {
          socket.emit("room-error", { message: "Speaking and listening languages are required" });
          return;
        }

        // Join room via service
        const room = await joinMeetingRoom(
          roomId,
          passcode,
          socket.userId,
          socket.id,
          { speakingLanguage, listeningLanguage }
        );

        // Track socket in room
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId).add(socket.id);
        socketToRoom.set(socket.id, roomId);
        socketToUser.set(socket.id, {
          userId: socket.userId,
          userName: socket.userName,
          speakingLanguage,
          listeningLanguage,
        });

        socket.join(roomId);

        // Get all participants
        const participants = await getRoomParticipants(roomId);

        // Notify user of successful join
        socket.emit("room-joined", {
          roomId,
          participants: participants.map((p) => ({
            userId: p.userId._id || p.userId,
            name: p.userId.name || "Unknown",
            speakingLanguage: p.speakingLanguage,
            listeningLanguage: p.listeningLanguage,
          })),
        });

        // Notify other participants
        socket.to(roomId).emit("user-joined", {
          userId: socket.userId,
          userName: socket.userName,
          speakingLanguage,
          listeningLanguage,
        });

        console.log(`User ${socket.userId} joined room ${roomId}`);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("room-error", { message: error.message });
      }
    });

    /**
     * WebRTC signaling: Offer
     */
    socket.on("offer", ({ offer, targetUserId, roomId }) => {
      socket.to(roomId).emit("offer", {
        offer,
        fromUserId: socket.userId,
        fromUserName: socket.userName,
      });
    });

    /**
     * WebRTC signaling: Answer
     */
    socket.on("answer", ({ answer, targetUserId, roomId }) => {
      socket.to(roomId).emit("answer", {
        answer,
        fromUserId: socket.userId,
        fromUserName: socket.userName,
      });
    });

    /**
     * WebRTC signaling: ICE candidate
     */
    socket.on("ice-candidate", ({ candidate, targetUserId, roomId }) => {
      socket.to(roomId).emit("ice-candidate", {
        candidate,
        fromUserId: socket.userId,
      });
    });

    /**
     * Receive audio chunk for translation
     */
    socket.on("audio-chunk", async ({ audioData, roomId, timestamp }) => {
      const roomIdFromSocket = socketToRoom.get(socket.id);
      if (!roomIdFromSocket || roomIdFromSocket !== roomId) {
        return;
      }

      const speakerInfo = socketToUser.get(socket.id);
      if (!speakerInfo) {
        return;
      }

      // Broadcast audio chunk to other participants
      // Each listener will handle translation on their end based on their language preferences
      socket.to(roomId).emit("audio-chunk-received", {
        audioData,
        fromUserId: socket.userId,
        fromUserName: socket.userName,
        speakingLanguage: speakerInfo.speakingLanguage,
        timestamp,
      });
    });

    /**
     * Receive transcribed text for translation
     */
    socket.on("transcribed-text", async ({ text, roomId, timestamp }) => {
      const roomIdFromSocket = socketToRoom.get(socket.id);
      if (!roomIdFromSocket || roomIdFromSocket !== roomId) {
        return;
      }

      const speakerInfo = socketToUser.get(socket.id);
      if (!speakerInfo || !text || !text.trim()) {
        return;
      }

      // Get all socket IDs in the room
      const roomSocketIds = activeRooms.get(roomId) || new Set();

      // Translate for each participant who needs translation
      for (const participantSocketId of roomSocketIds) {
        const participantInfo = socketToUser.get(participantSocketId);

        if (!participantInfo || participantSocketId === socket.id) {
          continue; // Skip self
        }

        const needsTranslation =
          speakerInfo.speakingLanguage !== participantInfo.listeningLanguage;

        if (needsTranslation) {
          try {
            // Use translator agent
            const translationResult = await translatorAgent.invoke({
              text,
              sourceLanguage: speakerInfo.speakingLanguage,
              targetLanguage: participantInfo.listeningLanguage,
              context: "academic",
            });

            // Send translated text to participant
            io.to(participantSocketId).emit("translated-text", {
              text: translationResult.translatedText,
              originalText: text,
              sourceLanguage: speakerInfo.speakingLanguage,
              targetLanguage: participantInfo.listeningLanguage,
              fromUserId: socket.userId,
              fromUserName: socket.userName,
              timestamp,
            });
          } catch (error) {
            console.error("Translation error:", error);
            // Send original text as fallback
            io.to(participantSocketId).emit("translated-text", {
              text,
              originalText: text,
              sourceLanguage: speakerInfo.speakingLanguage,
              targetLanguage: participantInfo.listeningLanguage,
              fromUserId: socket.userId,
              fromUserName: socket.userName,
              timestamp,
              error: "Translation failed, using original text",
            });
          }
        } else {
          // No translation needed, send original text
          io.to(participantSocketId).emit("translated-text", {
            text,
            originalText: text,
            sourceLanguage: speakerInfo.speakingLanguage,
            targetLanguage: participantInfo.listeningLanguage,
            fromUserId: socket.userId,
            fromUserName: socket.userName,
            timestamp,
            needsTranslation: false,
          });
        }
      }
    });

    /**
     * Handle disconnection
     */
    socket.on("disconnect", async () => {
      const roomId = socketToRoom.get(socket.id);

      if (roomId) {
        // Remove from room
        await leaveMeetingRoom(roomId, socket.id);

        if (activeRooms.has(roomId)) {
          activeRooms.get(roomId).delete(socket.id);
          if (activeRooms.get(roomId).size === 0) {
            activeRooms.delete(roomId);
          }
        }

        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);

        // Notify other participants
        socket.to(roomId).emit("user-left", {
          userId: socket.userId,
          userName: socket.userName,
        });

        console.log(`User ${socket.userId} left room ${roomId}`);
      }

      console.log(`User disconnected: ${socket.userId} (${socket.id})`);
    });
  });

  return io;
};

