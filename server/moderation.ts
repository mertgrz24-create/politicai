import type { Persona } from '../src/types/index.js'
import profanity from './profanity-tr.json' with { type: 'json' }

export function moderate(content: string, persona: Pick<Persona, 'max_chars' | 'banned_words' | 'banned_topics'>, title = ''): string[] {
  const lower = content.toLocaleLowerCase('tr-TR')
  const flags: string[] = []
  const count = Array.from(content).length
  if (!count) flags.push('empty_content')
  if (count > Math.min(persona.max_chars || 280, 280)) flags.push(`over_limit:${count}`)
  if (count < 20) flags.push('kisa_icerik')
  // Unicode word boundaries handle Turkish letters, unlike JavaScript \b.
  const hasWord = (word: string) => new RegExp(`(^|[^\\p{L}\\p{N}_])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}_])`, 'u').test(lower)
  for (const word of persona.banned_words ?? []) if (word && hasWord(word.toLocaleLowerCase('tr-TR'))) flags.push(`banned_word:${word}`)
  for (const topic of persona.banned_topics ?? []) if (topic && lower.includes(topic.toLocaleLowerCase('tr-TR'))) flags.push(`banned_topic:${topic}`)
  for (const word of profanity) if (hasWord(word)) flags.push(`profanity:${word}`)
  if (/https?:\/\/\S+|www\.\S+/i.test(content)) flags.push('contains_url')
  if (/#[\p{L}\p{N}_]+/u.test(content)) flags.push('contains_hashtag')
  if (/\p{Extended_Pictographic}/u.test(content)) flags.push('contains_emoji')
  if (/\b(the|and|with|for|from|that|this|you|your|news|update|breaking|today)\b/i.test(content)) flags.push('english_word_detected')
  const words = title.toLocaleLowerCase('tr-TR').split(/\s+/)
  if (words.length >= 5 && words.some((_, i) => i + 5 <= words.length && lower.includes(words.slice(i, i + 5).join(' ')))) flags.push('title_echo')
  return flags
}
