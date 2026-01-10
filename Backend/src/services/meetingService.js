import { MeetingRoom } from "../models/MeetingRoom.js";
import crypto from "crypto";

/**
 * Generate a unique room ID
 */
export const generateRoomId = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

/**
 * Generate a secure passcode
 */
export const generatePasscode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create a new meeting room
 */
export const createMeetingRoom = async (userId) => {
  const roomId = generateRoomId();
  const passcode = generatePasscode();

  const room = new MeetingRoom({
    roomId,
    passcode,
    createdBy: userId,
    participants: [],
  });

  await room.save();
  return room;
};

/**
 * Join a meeting room with passcode validation
 */
export const joinMeetingRoom = async (roomId, passcode, userId, socketId, languagePrefs) => {
  const room = await MeetingRoom.findOne({ roomId, isActive: true });

  if (!room) {
    throw new Error("Meeting room not found or inactive");
  }

  if (room.passcode !== passcode) {
    throw new Error("Invalid passcode");
  }

  // Check if user already in room
  const existingParticipant = room.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  if (existingParticipant) {
    // Update socket ID and language preferences
    existingParticipant.socketId = socketId;
    existingParticipant.speakingLanguage = languagePrefs.speakingLanguage;
    existingParticipant.listeningLanguage = languagePrefs.listeningLanguage;
  } else {
    // Add new participant
    room.participants.push({
      userId,
      socketId,
      speakingLanguage: languagePrefs.speakingLanguage,
      listeningLanguage: languagePrefs.listeningLanguage,
    });
  }

  await room.save();
  return room;
};

/**
 * Get room details
 */
export const getMeetingRoom = async (roomId) => {
  return await MeetingRoom.findOne({ roomId, isActive: true })
    .populate("participants.userId", "name email")
    .populate("createdBy", "name email");
};

/**
 * Remove participant from room
 */
export const leaveMeetingRoom = async (roomId, socketId) => {
  const room = await MeetingRoom.findOne({ roomId, isActive: true });

  if (!room) {
    return null;
  }

  room.participants = room.participants.filter((p) => p.socketId !== socketId);
  await room.save();

  return room;
};

/**
 * Get all participants in a room
 */
export const getRoomParticipants = async (roomId) => {
  const room = await MeetingRoom.findOne({ roomId, isActive: true })
    .populate("participants.userId", "name email");

  return room ? room.participants : [];
};

