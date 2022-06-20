import { createHash } from 'crypto'

/**
 * Make random hash
 */
export function randomHash(): string {
  return [...Array(10)]
    .map(x => 0)
    .map(() => Math.random().toString(36).slice(2))
    .join('')
}

/**
 * make hash from string
 */
export function hash(string: string) {
  return createHash('sha256').update(string).digest('hex')
}
