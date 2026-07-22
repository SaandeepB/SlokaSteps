import { SARVAM_V3_VOICES } from './common.mjs'

export class MissingProviderCredentialError extends Error {
  constructor(provider, variable) {
    super(`${provider} is not configured. Set ${variable} in a trusted environment.`)
    this.name = 'MissingProviderCredentialError'
    this.provider = provider
    this.variable = variable
  }
}

/** Build-time Sarvam adapter. This module is never imported by browser code. */
export class SarvamTextToSpeechProvider {
  id = 'sarvam'

  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.SARVAM_API_KEY ?? ''
    this.model = options.model ?? process.env.SARVAM_TTS_MODEL ?? 'bulbul:v3'
    this.endpoint = options.endpoint ?? 'https://api.sarvam.ai/text-to-speech'
  }

  isConfigured() {
    return this.apiKey.length > 0
  }

  async synthesize(request) {
    if (!this.isConfigured()) {
      throw new MissingProviderCredentialError('Sarvam', 'SARVAM_API_KEY')
    }
    if (!request.text?.trim()) throw new Error('TTS text cannot be empty.')
    if (this.model === 'bulbul:v3' && request.pitch !== undefined && request.pitch !== 0) {
      throw new Error('Sarvam Bulbul v3 does not support pitch. Omit pitch or use a compatible provider.')
    }

    const outputFormat = request.outputFormat ?? 'mp3'
    const speaker = request.speaker ?? 'shubh'
    const body = {
      text: request.text,
      target_language_code: request.language,
      speaker,
      pace: request.pace ?? 1,
      speech_sample_rate: 24000,
      model: this.model,
      output_audio_codec: outputFormat,
      ...(request.pronunciationDictionaryId
        ? { dict_id: request.pronunciationDictionaryId }
        : {}),
      ...(this.model === 'bulbul:v2' && request.pitch !== undefined
        ? { pitch: request.pitch }
        : {}),
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Sarvam TTS failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      )
    }

    const payload = await response.json()
    if (!Array.isArray(payload.audios) || payload.audios.length === 0) {
      throw new Error('Sarvam TTS response did not include audio data.')
    }
    return {
      buffer: Buffer.from(payload.audios.join(''), 'base64'),
      mimeType: outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      provider: this.id,
      voiceId: speaker,
      model: this.model,
      requestId: typeof payload.request_id === 'string' ? payload.request_id : undefined,
    }
  }
}

export class GoogleTextToSpeechProvider {
  id = 'google'

  isConfigured() {
    return false
  }

  async synthesize() {
    throw new Error('GoogleTextToSpeechProvider is a secure server-side placeholder.')
  }
}

export class AzureTextToSpeechProvider {
  id = 'azure'

  isConfigured() {
    return false
  }

  async synthesize() {
    throw new Error('AzureTextToSpeechProvider is a secure server-side placeholder.')
  }
}

export class BrowserSpeechFallback {
  id = 'browser-fallback'

  isConfigured() {
    return false
  }

  async synthesize() {
    throw new Error('BrowserSpeechFallback plays at runtime and cannot generate reviewable files.')
  }
}

export function createTextToSpeechProvider(id) {
  if (id === 'sarvam') return new SarvamTextToSpeechProvider()
  if (id === 'google') return new GoogleTextToSpeechProvider()
  if (id === 'azure') return new AzureTextToSpeechProvider()
  throw new Error(`Unsupported build-time TTS provider: ${id}`)
}

export function listKnownVoices(provider) {
  if (provider === 'sarvam') return [...SARVAM_V3_VOICES]
  return []
}
