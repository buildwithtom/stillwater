import type { VoiceRecording } from './recordings'

const audioType = 'audio/mpeg'

export function supportsRecordings() {
  return typeof Audio !== 'undefined' && Boolean(new Audio().canPlayType(audioType))
}

export function recordingAudio(track: VoiceRecording) {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = import.meta.env.BASE_URL + 'voices/' + track.clip
  return audio
}

export function releaseRecording(audio?: HTMLAudioElement) {
  if (!audio) return
  audio.onplaying = null
  audio.onpause = null
  audio.onended = null
  audio.onerror = null
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}
