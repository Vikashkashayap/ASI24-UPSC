# Live Meeting Module with AI Translation

A real-time web meeting system with automatic language translation, built for the UPSC Mentor platform.

## Features

- **Real-time Video/Audio Meetings**: WebRTC-based peer-to-peer communication
- **Room-based System**: Create or join meetings with Room ID and Passcode
- **Multi-language Support**: Support for 8+ Indian languages (English, Hindi, Telugu, Tamil, Kannada, Marathi, Gujarati, Bengali)
- **AI-powered Translation**: Automatic speech-to-speech translation using LangChain + OpenRouter
- **UPSC-optimized**: Preserves academic and UPSC-specific terminology during translation
- **Low Latency**: Optimized for 2-4 second translation latency

## Architecture

### Backend Components

1. **Meeting Room Model** (`Backend/src/models/MeetingRoom.js`)
   - Stores room information, passcode, and participants
   - Tracks language preferences per participant

2. **Meeting Service** (`Backend/src/services/meetingService.js`)
   - Room creation and management
   - Passcode validation
   - Participant tracking

3. **Translator Agent** (`Backend/src/agents/translatorAgent.js`)
   - LangChain-based translation using OpenRouter API
   - Optimized for academic/UPSC content
   - Preserves technical terminology

4. **Socket Service** (`Backend/src/services/socketService.js`)
   - WebRTC signaling via Socket.io
   - Real-time translation orchestration
   - Participant management

5. **Meeting Routes** (`Backend/src/routes/meetingRoutes.js`)
   - REST API for room creation/joining
   - Room details retrieval

### Frontend Components

1. **Meeting Page** (`Frontend/src/pages/MeetingPage.tsx`)
   - Main meeting interface
   - Language selection UI
   - Video grid display
   - Media controls

2. **Socket Hook** (`Frontend/src/hooks/useSocket.tsx`)
   - Socket.io client connection
   - Authentication integration

3. **WebRTC Integration**
   - Peer-to-peer connections
   - Audio/video streaming
   - ICE candidate exchange

4. **Speech Recognition (STT)**
   - Browser-native Web Speech API
   - Continuous speech recognition
   - Language-specific recognition

5. **Text-to-Speech (TTS)**
   - Browser-native Speech Synthesis API
   - Language-specific voice output

## Translation Flow

1. **Speaker speaks** → Audio captured via microphone
2. **Speech-to-Text** → Browser Web Speech API transcribes audio
3. **Text sent to server** → Socket.io emits transcribed text
4. **Server translates** → Translator Agent processes text via LangChain + OpenRouter
5. **Translation sent to listeners** → Each listener receives text in their preferred language
6. **Text-to-Speech** → Browser synthesizes translated text as audio

**Optimization**: If speaker language = listener language, translation is bypassed to save API costs.

## Setup Instructions

### Backend Setup

1. Install dependencies:
```bash
cd Backend
npm install socket.io
```

2. Environment variables (add to `.env`):
```env
PORT=5000
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
CLIENT_ORIGIN=http://localhost:5173
```

3. The server automatically initializes Socket.io on startup.

### Frontend Setup

1. Install dependencies:
```bash
cd Frontend
npm install socket.io-client
```

2. The meeting page is accessible via the sidebar navigation "Live Meeting".

## Usage

### Creating a Meeting

1. Navigate to "Live Meeting" from the sidebar
2. Click "Create Room"
3. Select your speaking and listening languages
4. Click "Create Room"
5. Share the Room ID and Passcode with participants

### Joining a Meeting

1. Navigate to "Live Meeting"
2. Enter Room ID and Passcode
3. Select your speaking and listening languages
4. Click "Join Room"
5. Allow camera/microphone permissions when prompted

### During the Meeting

- **Video Toggle**: Click video icon to enable/disable camera
- **Audio Toggle**: Click microphone icon to enable/disable microphone
- **Translation**: Automatic - speaks in your selected listening language
- **Leave**: Click "Leave" button to exit the meeting

## Supported Languages

- English (en)
- Hindi (hi)
- Telugu (te)
- Tamil (ta)
- Kannada (kn)
- Marathi (mr)
- Gujarati (gu)
- Bengali (bn)

## Technical Details

### WebRTC Signaling

- **Offer/Answer**: Peer connections established via SDP exchange
- **ICE Candidates**: NAT traversal using Google STUN servers
- **Peer-to-Peer**: Direct audio/video streaming between participants

### Translation Pipeline

- **Input**: Transcribed text from Web Speech API
- **Processing**: LangChain + OpenRouter API (configurable model)
- **Output**: Translated text optimized for spoken audio
- **Latency**: 2-4 seconds (depends on API response time)

### Performance Considerations

- Audio chunks processed in 1-2 second intervals
- Translation only when languages differ
- Direct WebRTC audio when no translation needed
- Browser-native STT/TTS (no additional API costs)

## API Endpoints

### POST `/api/meeting/create`
Create a new meeting room.

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "A1B2C3D4",
    "passcode": "123456",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/meeting/join`
Join an existing meeting room.

**Body:**
```json
{
  "roomId": "A1B2C3D4",
  "passcode": "123456"
}
```

### GET `/api/meeting/:roomId`
Get room details and participants.

## Socket.io Events

### Client → Server

- `join-room`: Join a meeting room
- `offer`: WebRTC offer
- `answer`: WebRTC answer
- `ice-candidate`: ICE candidate
- `transcribed-text`: Send transcribed text for translation

### Server → Client

- `room-joined`: Confirmation of room join
- `user-joined`: New participant joined
- `user-left`: Participant left
- `offer`: WebRTC offer from peer
- `answer`: WebRTC answer from peer
- `ice-candidate`: ICE candidate from peer
- `translated-text`: Translated text for listener
- `room-error`: Error message

## Security

- JWT authentication required for all endpoints
- Socket.io authentication via JWT token
- Passcode-protected rooms
- User session validation

## Limitations & Future Enhancements

### Current Limitations

- Browser compatibility: Web Speech API requires Chrome/Edge (Safari/Firefox have limited support)
- STUN-only: No TURN servers for strict NAT environments
- Single room: One meeting at a time per user
- No recording: Meetings are not recorded

### Future Enhancements

- TURN server integration for better NAT traversal
- Meeting recording functionality
- Screen sharing support
- Chat functionality alongside audio/video
- Meeting history and analytics
- Mobile app support
- Better error handling and reconnection logic

## Troubleshooting

### Microphone/Camera Not Working

- Check browser permissions
- Ensure HTTPS in production (required for media access)
- Try different browser (Chrome/Edge recommended)

### Translation Not Working

- Verify OpenRouter API key is set
- Check browser console for errors
- Ensure speaking/listening languages are different for translation

### Connection Issues

- Check Socket.io connection status
- Verify backend server is running
- Check network/firewall settings
- Ensure STUN servers are accessible

## Integration Points

The meeting module integrates with:

- **Authentication**: Uses existing JWT auth system
- **LangChain**: Uses existing LangChain setup for translation
- **OpenRouter**: Uses existing OpenRouter configuration
- **Database**: Uses existing MongoDB connection
- **UI Theme**: Respects existing dark/light theme

## Code Structure

```
Backend/
├── src/
│   ├── agents/
│   │   └── translatorAgent.js      # Translation agent
│   ├── controllers/
│   │   └── meetingController.js    # REST API handlers
│   ├── models/
│   │   └── MeetingRoom.js          # Room data model
│   ├── routes/
│   │   └── meetingRoutes.js        # API routes
│   ├── services/
│   │   ├── meetingService.js       # Room management
│   │   └── socketService.js        # Socket.io server
│   └── server.js                   # Updated with Socket.io

Frontend/
├── src/
│   ├── hooks/
│   │   └── useSocket.tsx           # Socket.io client hook
│   ├── pages/
│   │   └── MeetingPage.tsx         # Main meeting UI
│   ├── services/
│   │   └── api.ts                  # Updated with meeting API
│   └── types/
│       └── speech.d.ts             # Web Speech API types
```

## License

Part of the UPSC Mentor platform.

