/**
 * Sets nth bit in value to num(0, 1)
 *
 * @export
 * @param {number} nth
 * @param {number} value
 * @param {number} num
 * @returns {number}
 */
export function setBit(nth: number, value: number|boolean, num: number): number {
  return (
    value
      ? (num | (1 << nth))
      : (num & ~(1 << nth))
  );
}

/**
 * Flips nth bit in value, 0 -> 1, 1 -> 0
 *
 * @export
 * @param {number} nth
 * @param {number} num
 * @returns {number}
 */
export function toggleBit(nth: number, value: number): number {
  return value ^ (1 << nth);
}

/**
 * Returns nth bit from value, 0 or 1
 *
 * @export
 * @param {number} nth
 * @param {number} value
 * @returns {number}
 */
export function getBit(nth: number, value: number): number {
  return (value >> nth) & 0x1;
}

/**
 * Remove whole flag from value, sets 0
 *
 * @export
 * @param {number} flag
 * @param {number} value
 * @returns {number}
 */
export function removeFlag(flag: number, value: number): number {
  return value & (~flag);
}

/**
 * Checks if nth bit is set in value
 *
 * @export
 * @param {number} nth
 * @param {number} value
 * @returns {boolean}
 */
export function isSetBit(nth: number, value: number): boolean {
  return getBit(nth, value) === 1;
}

/**
 * Checks if bitmask flag is in value
 *
 * @export
 * @param {number} flag
 * @param {number} value
 * @returns {boolean}
 */
export function hasFlag(flag: number, value: number): boolean {
  return (value & flag) === flag;
}

/**
 * Get most significant bit
 *
 * @export
 * @param {number} num
 * @param {number} [byte=0x1]
 * @returns {number}
 */
export function getMSbit(num: number, byte: number = 0x1): number {
  return (num >> (byte * 0x8 - 0x1)) & 0x1;
}

/**
 * Get bit next to most significant bit
 *
 * @export
 * @param {number} num
 * @param {number} [byte=0x1]
 * @returns {number}
 */
export function getSMSbit(num: number, byte: number = 0x1): number {
  return (num >> ((byte * 0x8 - 0x1) - 1)) & 0x1;
}

/**
 * Flips bytes horizontally in byte, much faster than reverseBits
 *
 * @export
 * @param {number} byte
 * @returns {number}
 */
export function reverseByte(byte: number): number {
  let retVal: number = 0x0;

  if (byte & 0x01) retVal |= 0x80;
  if (byte & 0x02) retVal |= 0x40;
  if (byte & 0x04) retVal |= 0x20;
  if (byte & 0x08) retVal |= 0x10;
  if (byte & 0x10) retVal |= 0x08;
  if (byte & 0x20) retVal |= 0x04;
  if (byte & 0x40) retVal |= 0x02;
  if (byte & 0x80) retVal |= 0x01;

  return retVal;
}
