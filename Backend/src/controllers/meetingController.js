import { createMeetingRoom, joinMeetingRoom, getMeetingRoom } from "../services/meetingService.js";

/**
 * Create a new meeting room
 */
export const createRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const room = await createMeetingRoom(userId);

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        passcode: room.passcode,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meeting room",
      error: error.message,
    });
  }
};

/**
 * Join a meeting room
 */
export const joinRoom = async (req, res) => {
  try {
    const { roomId, passcode } = req.body;
    const userId = req.user.id;

    if (!roomId || !passcode) {
      return res.status(400).json({
        success: false,
        message: "Room ID and passcode are required",
      });
    }

    // Note: socketId and language preferences will be set via Socket.io
    const room = await getMeetingRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Meeting room not found",
      });
    }

    if (room.passcode !== passcode) {
      return res.status(401).json({
        success: false,
        message: "Invalid passcode",
      });
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        participants: room.participants.length,
      },
    });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join meeting room",
      error: error.message,
    });
  }
};

/**
 * Get room details
 */
export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getMeetingRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Meeting room not found",
      });
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        createdBy: room.createdBy,
        participants: room.participants.map((p) => ({
          userId: p.userId._id || p.userId,
          name: p.userId.name || "Unknown",
          email: p.userId.email || "",
          speakingLanguage: p.speakingLanguage,
          listeningLanguage: p.listeningLanguage,
        })),
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get room details",
      error: error.message,
    });
  }
};

