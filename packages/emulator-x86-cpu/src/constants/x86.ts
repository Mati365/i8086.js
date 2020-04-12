import * as R from 'ramda';

import {MemRange} from '@compiler/core/types';
import {
  X86Prefix,
  X86RegsSet,
} from '../types/X86Regs';

export const X86_MAPPED_VM_MEM = Object.freeze(new MemRange(0xC8000, 0xEFFFF));

export const X86_EXCEPTION = {
  MEM_DUMP: 0x0,
  DIV_BY_ZERO: 0x1,
};

export const X86_BINARY_MASKS = {
  0x1: (0x2 << 0x7) - 0x1,
  0x2: (0x2 << 0xF) - 0x1,
  0x4: ((0x2 << 0x1F) - 0x1) >>> 0,
};

export const X86_PREFIXES: {[key: number]: X86Prefix} = {
  0xF0: 0x0, /** LOCK */
  0xF3: 0x0, /** REP  */
  0xF2: 0x1, /** REPNE */

  /** Segment override */
  0x2E: {_sr: 'cs'},
  0x36: {_sr: 'ss'},
  0x3E: {_sr: 'ds'},
  0x26: {_sr: 'es'},
  0x64: {_sr: 'fs'},
  0x65: {_sr: 'gs'},

  0x66: 0x2, /** Operrand override */
  0x67: 0x3, /** Adress override  */
};

/** Used to access prefixes inside CPU */
export const X86_PREFIX_LABEL_MAP = {
  0x0: 'instruction',
  0x1: 'segment',
  0x2: 'operandSize',
  0x3: 'addressSize',
};

export const X86_REGISTERS: {[number: string]: X86RegsSet} = {
  /** 8bit registers indexes */
  0x1: {
    0x0: 'al', 0x1: 'cl',
    0x2: 'dl', 0x3: 'bl',
    0x4: 'ah', 0x5: 'ch',
    0x6: 'dh', 0x7: 'bh',
  },

  /** 16bit register indexes */
  0x2: {
    0x0: 'ax', 0x1: 'cx',
    0x2: 'dx', 0x3: 'bx',
    0x4: 'sp', 0x5: 'bp',
    0x6: 'si', 0x7: 'di',
  },

  /** Segment registers */
  sreg: {
    0x0: 'es', 0x1: 'cs',
    0x2: 'ss', 0x3: 'ds',
    0x4: 'fs', 0x5: 'gs',
  },
};

export const X86_REGISTER_NAMES = R.compose(
  R.unnest,
  R.map(
    ([, regs]) => R.values(regs),
  ),
  R.toPairs,
)(X86_REGISTERS);

export const X86_FLAGS_OFFSETS = {
  cf: 0x0, /** Carry flag */
  pf: 0x2, /** Parity flag */
  af: 0x4, /** Auxiliary - Carry Flags */
  zf: 0x6, /** Zero flag */
  sf: 0x7, /** Signum flag */
  tf: 0x8, /** Trap flag */
  if: 0x9, /** Interrupt flag */
  df: 0xA, /** Direction flag */
  of: 0xB, /** Overflow flag */
};

/** CP437 to Unicode conversion table */
export const CP437_UNICODE_FONT_MAPPING = [
  0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007,
  0x0008, 0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x000e, 0x000f,
  0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017,
  0x0018, 0x0019, 0x001a, 0x001b, 0x001c, 0x001d, 0x001e, 0x001f,
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027,
  0x0028, 0x0029, 0x002a, 0x002b, 0x002c, 0x002d, 0x002e, 0x002f,
  0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037,
  0x0038, 0x0039, 0x003a, 0x003b, 0x003c, 0x003d, 0x003e, 0x003f,
  0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047,
  0x0048, 0x0049, 0x004a, 0x004b, 0x004c, 0x004d, 0x004e, 0x004f,
  0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057,
  0x0058, 0x0059, 0x005a, 0x005b, 0x005c, 0x005d, 0x005e, 0x005f,
  0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067,
  0x0068, 0x0069, 0x006a, 0x006b, 0x006c, 0x006d, 0x006e, 0x006f,
  0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077,
  0x0078, 0x0079, 0x007a, 0x007b, 0x007c, 0x007d, 0x007e, 0x007f,
  0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7,
  0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
  0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9,
  0x00ff, 0x00d6, 0x00dc, 0x00a2, 0x00a3, 0x00a5, 0x20a7, 0x0192,
  0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba,
  0x00bf, 0x2310, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556,
  0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f,
  0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567,
  0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b,
  0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580,
  0x03b1, 0x00df, 0x0393, 0x03c0, 0x03a3, 0x03c3, 0x00b5, 0x03c4,
  0x03a6, 0x0398, 0x03a9, 0x03b4, 0x221e, 0x03c6, 0x03b5, 0x2229,
  0x2261, 0x00b1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00f7, 0x2248,
  0x00b0, 0x2219, 0x00b7, 0x221a, 0x207f, 0x00b2, 0x25a0, 0x0020,
];

export const BIOS_COLOR_TABLE = {
  0x0: '#000000',
  0x1: '#0000AA',
  0x2: '#00AA00',
  0x3: '#00AAAA',
  0x4: '#AA0000',
  0x5: '#AA00AA',
  0x6: '#AA5500',
  0x7: '#AAAAAA',
  0x8: '#555555',
  0x9: '#5555FF',
  0xA: '#55FF55',
  0xB: '#55FFFF',
  0xC: '#FF5555',
  0xD: '#FF55FF',
  0xE: '#FFFF55',
  0xF: '#FFFFFF',
};

/**
 * @see {@link http://stanislavs.org/helppc/scan_codes.html}
 * @see {@link https://github.com/stu/xi8088_bios/blob/master/scancode.inc}
 * @see {@link https://www.win.tue.nl/~aeb/linux/kbd/scancodes-10.html}
 */
export const SCAN_CODES_TABLE = {
  /* Key  Ascii Normal  Shift   Ctrl    Alt */
  /** A */ 65: [0x1E61, 0x1E41, 0x1E01, 0x1E00],
  /** B */ 66: [0x3062, 0x3042, 0x3002, 0x3000],
  /** C */ 67: [0x2E63, 0x2E43, 0x2E03, 0x2E00],
  /** D */ 68: [0x2064, 0x2044, 0x2004, 0x2000],
  /** E */ 69: [0x1265, 0x1245, 0x1205, 0x1200],
  /** F */ 70: [0x2166, 0x2146, 0x2106, 0x2100],
  /** G */ 71: [0x2267, 0x2247, 0x2207, 0x2200],
  /** H */ 72: [0x2368, 0x2348, 0x2308, 0x2300],
  /** I */ 73: [0x1769, 0x1749, 0x1709, 0x1700],
  /** J */ 74: [0x246A, 0x244A, 0x240A, 0x2400],
  /** K */ 75: [0x256B, 0x254B, 0x250B, 0x2500],
  /** L */ 76: [0x266C, 0x264C, 0x260C, 0x2600],
  /** M */ 77: [0x326D, 0x324D, 0x320D, 0x3200],
  /** N */ 78: [0x316E, 0x314E, 0x310E, 0x3100],
  /** O */ 79: [0x186F, 0x184F, 0x180F, 0x1800],
  /** P */ 80: [0x1970, 0x1950, 0x1910, 0x1900],
  /** Q */ 81: [0x1071, 0x1051, 0x1011, 0x1000],
  /** R */ 82: [0x1372, 0x1352, 0x1312, 0x1300],
  /** S */ 83: [0x1F73, 0x1F53, 0x1F13, 0x1F00],
  /** T */ 84: [0x1474, 0x1454, 0x1414, 0x1400],
  /** U */ 85: [0x1675, 0x1655, 0x1615, 0x1600],
  /** V */ 86: [0x2F76, 0x2F56, 0x2F16, 0x2F00],
  /** W */ 87: [0x1177, 0x1157, 0x1117, 0x1100],
  /** X */ 88: [0x2D78, 0x2D58, 0x2D18, 0x2D00],
  /** Y */ 89: [0x1579, 0x1559, 0x1519, 0x1500],
  /** Z */ 90: [0x2C7A, 0x2C5A, 0x2C1A, 0x2C00],
  /** 0 */ 48: [0x0B30, 0x0B29, null, 0x8100],
  /** 1 */ 49: [0x0231, 0x0221, null, 0x7800],
  /** 2 */ 50: [0x0332, 0x0340, 0x0300, 0x7900],
  /** 3 */ 51: [0x0433, 0x0423, null, 0x7A00],
  /** 4 */ 52: [0x0534, 0x0524, null, 0x7B00],
  /** 5 */ 53: [0x0635, 0x0625, null, 0x7C00],
  /** 6 */ 54: [0x0736, 0x075E, 0x071E, 0x7D00],
  /** 7 */ 55: [0x0837, 0x0826, null, 0x7E00],
  /** 8 */ 56: [0x0938, 0x092A, null, 0x7F00],
  /** 9 */ 57: [0x0A39, 0x0A28, null, 0x8000],

  /** . */ 190: [0x342E, 0x343E, null, null],

  /** LEFT ARROW  */ 37: [0x4B00, 0x4B34, 0x7300, 0x9B00],
  /** RIGHT ARROW */ 39: [0x4D00, 0x4D36, 0x7400, 0x9D00],

  /** UP ARROW    */ 38: [0x4800, 0x4838, 0x8D00, 0x9800],
  /** DOWN ARROW  */ 40: [0x5000, 0x5032, 0x9100, 0xA000],

  /** ENTER */ 13: [0x1C0D, 0x01C0, 0x1C0A, 0xA600],
  /** ESC   */ 27: [0x011B, 0x011B, 0x011B, 0x0100],

  /** SPACE */ 32: [0x3920, 0x3920, 0x3920, 0x3920],
  /** BACKS */ 8: [0x0E08, 0x0E08, 0x0E7F, 0x0E00],

  /* F1 */ 112: [0x3B00, 0x5400, 0x5E00, 0x6800],
  /* F2 */ 113: [0x3C00, 0x5500, 0x5F00, 0x6900],
  /* F3 */ 114: [0x3D00, 0x5600, 0x6000, 0x6A00],
  /* F4 */ 115: [0x3E00, 0x5700, 0x6100, 0x6B00],
  /* F5 */ 116: [0x3F00, 0x5800, 0x6200, 0x6C00],
  /* F6 */ 117: [0x4000, 0x5900, 0x6300, 0x6D00],
  /* F7 */ 118: [0x4100, 0x5A00, 0x6400, 0x6E00],
  /* F8 */ 119: [0x4200, 0x5B00, 0x6500, 0x6F00],
  /* F9 */ 120: [0x4300, 0x5C00, 0x6600, 0x7000],
  /* F10 */ 121: [0x4400, 0x5D00, 0x6700, 0x7100],
  /* F11 */ 122: [0x8500, 0x8700, 0x8900, 0x8B00],
  /* F12 */ 123: [0x8600, 0x8800, 0x8A00, 0x8C00],
};

/**
 * AT/PS2 SCAN_CODES
 *
 * @see {@link https://wiki.osdev.org/PS/2_Keyboard#Scan_Code_Set_2}
 */
export const AT2_SCAN_CODES_QWERTY = {
  PRESSED: {
    ...SCAN_CODES_TABLE, // todo: add more extensions

    /** LEFT ARROW  */ 37: [0x4BE0],
    /** RIGHT ARROW */ 39: [0x4DE0],

    /** UP ARROW    */ 38: [0x48E0],
    /** DOWN ARROW  */ 40: [0x50E0],
  },
};

/** Mapped memory regions offsets */
export const X86_REALMODE_MAPPED_ADDRESSES = {
  text: 0xB8000,
  color: 0xA0000,
};
