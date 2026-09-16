import {
  loadLocalEnvironment,
  NARRATION_LANGUAGES,
  parseArgs,
  speakerForLanguage,
} from './common.mjs'
import { generateAudioSegments } from './pipeline.mjs'

const samples = {
  'en-IN': 'Welcome to Sloka Steps. Let us learn calmly, one step at a time.',
  'hi-IN': 'श्लोक स्टेप्स में आपका स्वागत है। आइए शांति से एक-एक कदम सीखें।',
  'te-IN': 'శ్లోక స్టెప్స్‌కు స్వాగతం. మనం ప్రశాంతంగా ఒక్కో అడుగు నేర్చుకుందాం.',
  'kn-IN': 'ಶ್ಲೋಕ ಸ್ಟೆಪ್ಸ್‌ಗೆ ಸ್ವಾಗತ. ನಾವು ಶಾಂತವಾಗಿ ಒಂದೊಂದೇ ಹೆಜ್ಜೆ ಕಲಿಯೋಣ.',
  'ta-IN': 'ஸ்லோகா ஸ்டெப்ஸுக்கு வரவேற்கிறோம். அமைதியாக ஒவ்வொரு படியாகக் கற்போம்.',
  'mr-IN': 'श्लोक स्टेप्समध्ये स्वागत आहे. चला शांतपणे एकेक पाऊल शिकूया.',
}

await loadLocalEnvironment()
const args = parseArgs(process.argv.slice(2))
const language = typeof args.language === 'string' ? args.language : 'en-IN'
if (!NARRATION_LANGUAGES.includes(language)) {
  console.error(`Unsupported language: ${language}. Choose ${NARRATION_LANGUAGES.join(', ')}.`)
  process.exitCode = 1
} else {
  const provider =
    typeof args.provider === 'string' ? args.provider : process.env.TTS_PROVIDER || 'sarvam'
  const speaker = speakerForLanguage(language)
  const segment = {
    contentType: 'sample',
    contentId: 'audio-lab-sample',
    segmentId: language.toLowerCase(),
    purpose: 'meaning-narration',
    language,
    text: samples[language],
    speaker,
    pace: 0.9,
    outputFormat: 'mp3',
    outputUrl: `/audio/samples/${language}/generated/${provider}-${speaker}.mp3`,
  }
  const summary = await generateAudioSegments([segment], provider)
  console.log(
    `Audio sample complete: ${summary.generated} generated, ${summary.cached} cached, ${summary.skipped} skipped, ${summary.failed} failed.`,
  )
  if (summary.failed > 0) process.exitCode = 1
}
