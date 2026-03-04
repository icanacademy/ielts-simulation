import express from 'express';
import {
  synthesizeSpeech,
  synthesizeLongText,
  synthesizeMultiVoice,
  VOICES,
  DEFAULT_VOICE,
  getVoicesByAccent
} from '../services/edgeTTSService.js';

const router = express.Router();

/**
 * Detect if text contains speaker labels (for multi-voice)
 */
const hasMultipleSpeakers = (text) => {
  // Match patterns like "AGENT:", "CLIENT:", "WOMAN:", etc.
  const speakerPattern = /^[A-Z][A-Z0-9\s]*[A-Z0-9]:\s/gm;
  const matches = text.match(speakerPattern);
  if (!matches) return false;

  // Get unique speakers
  const uniqueSpeakers = new Set(matches.map(m => m.trim()));
  return uniqueSpeakers.size >= 2;
};

/**
 * POST /api/tts/speak
 * Generate speech audio from text using Edge TTS neural voices
 *
 * Body: {
 *   text: string (required) - Text to convert to speech
 *   voice: string (optional) - Voice ID (default: en-GB-SoniaNeural)
 *   rate: string (optional) - Speech rate (default: -5%)
 *   pitch: string (optional) - Voice pitch (default: +0Hz)
 * }
 *
 * Returns: MP3 audio file
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, voice = DEFAULT_VOICE, rate = '-5%', pitch = '+0Hz' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`TTS Request: ${text.length} chars, voice: ${voice}, rate: ${rate}`);
    const startTime = Date.now();

    let audioBuffer;

    // Check if script has multiple speakers (for conversations)
    if (hasMultipleSpeakers(text)) {
      console.log('Detected multiple speakers - using multi-voice synthesis');
      audioBuffer = await synthesizeMultiVoice(text, rate);
    } else {
      // Single voice for monologues or simple text
      audioBuffer = text.length > 3000
        ? await synthesizeLongText(text, voice, rate, pitch)
        : await synthesizeSpeech(text, voice, rate, pitch);
    }

    const duration = Date.now() - startTime;
    console.log(`TTS Complete: ${audioBuffer.length} bytes in ${duration}ms`);

    // Send as MP3 audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tts/speak/stream
 * Stream speech audio (for longer texts)
 * Uses chunked transfer encoding
 */
router.post('/speak/stream', async (req, res) => {
  try {
    const { text, voice = DEFAULT_VOICE, rate = '-5%', pitch = '+0Hz' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`TTS Stream Request: ${text.length} chars`);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });

    // For streaming, we generate and send immediately
    const audioBuffer = await synthesizeSpeech(text.substring(0, 3000), voice, rate, pitch);
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Stream Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/tts/voices
 * Get list of available voices
 */
router.get('/voices', (req, res) => {
  res.json({
    voices: VOICES,
    defaultVoice: DEFAULT_VOICE,
    byAccent: getVoicesByAccent()
  });
});

/**
 * POST /api/tts/test
 * Test TTS with a short phrase
 */
router.post('/test', async (req, res) => {
  try {
    const { voice = DEFAULT_VOICE } = req.body;
    const testText = 'Welcome to the IELTS listening test. Please listen carefully.';

    const audioBuffer = await synthesizeSpeech(testText, voice, '-5%', '+0Hz');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Test Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
