import textToSpeech from '@google-cloud/text-to-speech';
import googleTTS from 'google-tts-api';

/**
 * Google Cloud TTS Service
 * Uses Google Cloud's high-quality neural voices if credentials available
 * Falls back to free google-tts-api otherwise
 */

// Initialize client - will use GOOGLE_APPLICATION_CREDENTIALS env var
let ttsClient = null;
let useCloudTTS = null; // null = not checked, true/false = result

const hasGoogleCredentials = () => {
  return !!(
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
};

const initClient = () => {
  if (ttsClient) return ttsClient;

  if (!hasGoogleCredentials()) {
    console.log('No Google Cloud credentials found, will use free TTS');
    useCloudTTS = false;
    return null;
  }

  try {
    if (process.env.GOOGLE_API_KEY) {
      ttsClient = new textToSpeech.TextToSpeechClient({
        apiKey: process.env.GOOGLE_API_KEY
      });
    } else {
      ttsClient = new textToSpeech.TextToSpeechClient();
    }
    useCloudTTS = true;
    return ttsClient;
  } catch (err) {
    console.error('Failed to initialize Google Cloud TTS:', err.message);
    useCloudTTS = false;
    return null;
  }
};

// American English neural voices only
export const VOICES = {
  'en-US-Neural2-C': { name: 'American Female', gender: 'Female', accent: 'American', description: 'Natural American female voice' },
  'en-US-Neural2-A': { name: 'American Male', gender: 'Male', accent: 'American', description: 'Natural American male voice' },

  // Simple language code (for backwards compatibility)
  'en-US': { name: 'American English', gender: 'Neutral', accent: 'American', description: 'Default American voice', defaultVoice: 'en-US-Neural2-C' },
};

// Default voice (American female)
export const DEFAULT_VOICE = 'en-US-Neural2-C';

/**
 * Get the actual voice name (handles simple codes like 'en-GB')
 */
const resolveVoiceName = (voice) => {
  if (VOICES[voice]?.defaultVoice) {
    return VOICES[voice].defaultVoice;
  }
  return voice;
};

/**
 * Extract language code from voice name
 */
const getLanguageCode = (voice) => {
  // Handle full voice names like 'en-GB-Neural2-A'
  const match = voice.match(/^(en-[A-Z]{2})/);
  return match ? match[1] : 'en-GB';
};

/**
 * Convert speech rate string to Google's format
 * Google uses speaking rate as a float (0.25 to 4.0, 1.0 is normal)
 */
const parseSpeechRate = (rate) => {
  if (typeof rate === 'number') return rate;
  if (rate === 'slow') return 0.85;
  if (rate === 'fast') return 1.15;

  // Parse percentage like '-5%' or '+10%'
  const match = String(rate).match(/([+-]?\d+)%?/);
  if (match) {
    const percent = parseInt(match[1]);
    // Convert percentage to rate (0% = 1.0, -10% = 0.9, +10% = 1.1)
    return 1.0 + (percent / 100);
  }
  return 0.95; // Default slightly slower for IELTS clarity
};

/**
 * Synthesize speech using Google Cloud TTS
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice ID (e.g., 'en-GB-Neural2-A' or 'en-GB')
 * @param {string} rate - Speech rate ('-5%' for slow, '+0%' for normal)
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
export const synthesizeSpeech = async (text, voice = DEFAULT_VOICE, rate = '-5%') => {
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided');
  }

  const voiceName = resolveVoiceName(voice);
  const languageCode = getLanguageCode(voiceName);
  const speakingRate = parseSpeechRate(rate);
  const startTime = Date.now();

  // Initialize and check if Cloud TTS is available
  const client = initClient();

  // If no Google Cloud credentials, use free TTS directly
  if (!client || useCloudTTS === false) {
    console.log(`Free Google TTS: ${text.length} chars, lang: ${languageCode}, slow: ${speakingRate < 1}`);
    const audioBuffer = await freeTTS(text, languageCode, speakingRate < 1);
    console.log(`Free TTS Complete: ${audioBuffer.length} bytes in ${Date.now() - startTime}ms`);
    return audioBuffer;
  }

  console.log(`Google Cloud TTS: ${text.length} chars, voice: ${voiceName}, rate: ${speakingRate}`);

  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: 0,
        volumeGainDb: 0,
        effectsProfileId: ['headphone-class-device'],
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioBuffer = Buffer.from(response.audioContent, 'base64');

    console.log(`Google Cloud TTS Complete: ${audioBuffer.length} bytes in ${Date.now() - startTime}ms`);
    return audioBuffer;

  } catch (error) {
    console.error('Google Cloud TTS Error:', error.message);
    console.log('Falling back to free Google TTS...');

    try {
      const audioBuffer = await freeTTS(text, languageCode, speakingRate < 1);
      console.log(`Fallback TTS Complete: ${audioBuffer.length} bytes in ${Date.now() - startTime}ms`);
      return audioBuffer;
    } catch (fallbackError) {
      console.error('Fallback TTS Error:', fallbackError.message);
      throw new Error('TTS failed: ' + error.message);
    }
  }
};

/**
 * Free google-tts-api (lower quality but always works)
 */
const freeTTS = async (text, lang, slow) => {
  if (text.length < 200) {
    const audioUrl = googleTTS.getAudioUrl(text, {
      lang: lang,
      slow: slow,
      host: 'https://translate.google.com',
    });

    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // For longer texts
  const audioUrls = await googleTTS.getAllAudioUrls(text, {
    lang: lang,
    slow: slow,
    host: 'https://translate.google.com',
    splitPunct: ',.?!;:',
  });

  const buffers = [];
  for (const urlObj of audioUrls) {
    const response = await fetch(urlObj.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const arrayBuffer = await response.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  return concatenateMP3(buffers);
};

/**
 * Concatenate MP3 buffers
 */
function concatenateMP3(buffers) {
  if (buffers.length === 1) return buffers[0];

  const result = [buffers[0]];

  for (let i = 1; i < buffers.length; i++) {
    const buffer = buffers[i];
    let startOffset = 0;

    // Skip ID3v2 tag if present
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      const tagSize = ((buffer[6] & 0x7f) << 21) |
                      ((buffer[7] & 0x7f) << 14) |
                      ((buffer[8] & 0x7f) << 7) |
                      (buffer[9] & 0x7f);
      startOffset = 10 + tagSize;
    }

    // Find first MP3 frame sync
    while (startOffset < buffer.length - 1) {
      if (buffer[startOffset] === 0xFF && (buffer[startOffset + 1] & 0xE0) === 0xE0) {
        break;
      }
      startOffset++;
    }

    result.push(buffer.slice(startOffset));
  }

  return Buffer.concat(result);
}

/**
 * Synthesize long text (alias)
 */
export const synthesizeLongText = synthesizeSpeech;

// Voice mapping for different speaker types
const SPEAKER_VOICE_MAP = {
  // Female speakers -> American Female
  'WOMAN': 'en-US-Neural2-C',
  'FEMALE': 'en-US-Neural2-C',
  'RECEPTIONIST': 'en-US-Neural2-C',
  'AGENT': 'en-US-Neural2-C',
  'SARAH': 'en-US-Neural2-C',
  'EMMA': 'en-US-Neural2-C',
  'LISA': 'en-US-Neural2-C',
  'JANE': 'en-US-Neural2-C',
  'MARY': 'en-US-Neural2-C',
  'ADVISOR': 'en-US-Neural2-C',
  'STAFF': 'en-US-Neural2-C',
  'GUIDE': 'en-US-Neural2-C',

  // Male speakers -> American Male
  'MAN': 'en-US-Neural2-A',
  'MALE': 'en-US-Neural2-A',
  'CUSTOMER': 'en-US-Neural2-A',
  'CLIENT': 'en-US-Neural2-A',
  'CALLER': 'en-US-Neural2-A',
  'MIKE': 'en-US-Neural2-A',
  'JOHN': 'en-US-Neural2-A',
  'DAVID': 'en-US-Neural2-A',
  'TOM': 'en-US-Neural2-A',
  'STUDENT': 'en-US-Neural2-A',

  // Neutral/default -> alternate based on order
  'SPEAKER': 'en-US-Neural2-C',
  'LECTURER': 'en-US-Neural2-A',
  'TUTOR': 'en-US-Neural2-A',
  'PROFESSOR': 'en-US-Neural2-A',
  'HOST': 'en-US-Neural2-C',
};

/**
 * Parse script into speaker segments
 */
const parseScriptBySpeaker = (script) => {
  const segments = [];
  const lines = script.split('\n');
  let currentSpeaker = null;
  let currentText = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match speaker patterns: "WOMAN:", "SPEAKER 1:", "[MAN]:", etc.
    const speakerMatch = trimmedLine.match(/^([A-Z][A-Z0-9\s]*[A-Z0-9]):(.*)$/) ||
                         trimmedLine.match(/^\[([A-Z][A-Z0-9\s]*[A-Z0-9])\]:?(.*)$/);

    if (speakerMatch) {
      // Save previous segment
      if (currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = speakerMatch[1].trim().toUpperCase();
      currentText = speakerMatch[2] ? speakerMatch[2].trim() : '';
    } else if (currentSpeaker) {
      currentText += ' ' + trimmedLine;
    }
  }

  // Don't forget last segment
  if (currentSpeaker && currentText.trim()) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return segments;
};

/**
 * Get voice for a speaker (alternates if unknown)
 */
const getVoiceForSpeaker = (speaker, speakerIndex, speakerList) => {
  // Check direct mapping
  const upperSpeaker = speaker.toUpperCase();
  if (SPEAKER_VOICE_MAP[upperSpeaker]) {
    return SPEAKER_VOICE_MAP[upperSpeaker];
  }

  // Check if speaker name contains a known keyword
  for (const [key, voice] of Object.entries(SPEAKER_VOICE_MAP)) {
    if (upperSpeaker.includes(key)) {
      return voice;
    }
  }

  // Alternate voices for unknown speakers based on their order of appearance
  const speakerPosition = speakerList.indexOf(speaker);
  return speakerPosition % 2 === 0 ? 'en-US-Neural2-C' : 'en-US-Neural2-A';
};

/**
 * Synthesize multi-voice script (for conversations/dialogues)
 * Parses the script, identifies speakers, and uses different voices
 */
export const synthesizeMultiVoice = async (script, rate = '-5%') => {
  const startTime = Date.now();
  console.log('=== MULTI-VOICE SYNTHESIS START ===');
  console.log(`Script length: ${script.length} chars`);

  // Parse script into segments
  const segments = parseScriptBySpeaker(script);

  if (segments.length === 0) {
    // No speakers found, use single voice
    console.log('No speaker segments found, using single voice');
    return synthesizeSpeech(script, DEFAULT_VOICE, rate);
  }

  console.log(`Found ${segments.length} segments from speakers:`,
    [...new Set(segments.map(s => s.speaker))]);

  // Get unique speakers list for alternating voices
  const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];

  // Generate audio for each segment
  const audioBuffers = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const voice = getVoiceForSpeaker(segment.speaker, i, uniqueSpeakers);

    console.log(`Segment ${i + 1}/${segments.length}: ${segment.speaker} -> ${voice} (${segment.text.length} chars)`);

    try {
      const audioBuffer = await synthesizeSpeech(segment.text, voice, rate);
      audioBuffers.push(audioBuffer);
    } catch (err) {
      console.error(`Error generating segment ${i + 1}:`, err.message);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Failed to generate any audio segments');
  }

  // Concatenate all audio
  const combined = concatenateMP3(audioBuffers);
  console.log(`=== MULTI-VOICE COMPLETE: ${combined.length} bytes in ${Date.now() - startTime}ms ===`);

  return combined;
};

/**
 * Get available voices grouped by accent
 */
export const getVoicesByAccent = () => {
  const grouped = {};

  for (const [id, info] of Object.entries(VOICES)) {
    // Skip simple language codes
    if (id.length <= 5) continue;

    if (!grouped[info.accent]) {
      grouped[info.accent] = [];
    }
    grouped[info.accent].push({ id, ...info });
  }

  return grouped;
};

/**
 * List all available voices from Google Cloud
 */
export const listAvailableVoices = async () => {
  try {
    const client = initClient();
    const [response] = await client.listVoices({ languageCode: 'en' });

    return response.voices
      .filter(v => v.languageCodes.some(lc => lc.startsWith('en-')))
      .map(v => ({
        name: v.name,
        languageCodes: v.languageCodes,
        gender: v.ssmlGender,
        naturalSampleRateHertz: v.naturalSampleRateHertz,
      }));
  } catch (error) {
    console.error('Error listing voices:', error.message);
    return Object.entries(VOICES).map(([id, info]) => ({ name: id, ...info }));
  }
};

export default {
  synthesizeSpeech,
  synthesizeLongText,
  synthesizeMultiVoice,
  VOICES,
  DEFAULT_VOICE,
  getVoicesByAccent,
  listAvailableVoices
};
