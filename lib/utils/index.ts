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
 * Make array unique
 * @param array
 */
export function arrayUnique<T>(array: T[]): T[] {
  const a = array.concat();
  for (let i = 0; i < a.length; ++i) {
    for (let j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j]) {
          a.splice(j--, 1);
      }
    }
  }
  return a;
}

/**
 * Check if array contains same values
 * @param array
 */
export function arrayIsSame(array1: any[], array2: any[]) {
  if (array1.length !== array2.length) {
    return false
  }

  for (let i = 0; i < array1.length; ++i) {
    if (array2.indexOf(array1[i]) === -1) {
      return false
    }
  }

  return true
}
