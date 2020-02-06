import * as R from 'ramda';

import {InstructionArgSize} from '../../../types/InstructionArg';
import {TokenLocation} from './TokenLocation';
import {
  TokenType,
  Token,
  TokenKind,
} from './Token';

type SizeOverrideTokenValue = {
  byteSize: number,
};

/**
 * Token that prefixes mem address with size
 *
 * @export
 * @class SizeOverrideToken
 * @extends {Token<SizeOverrideTokenValue>}
 */
export class SizeOverrideToken extends Token<SizeOverrideTokenValue> {
  constructor(
    text: string,
    byteSize: number,
    loc: TokenLocation,
  ) {
    super(
      TokenType.KEYWORD,
      TokenKind.BYTE_SIZE_OVERRIDE,
      text,
      loc,
      {
        byteSize,
      },
    );
  }

  /**
   * Matches token with provided size
   *
   * @static
   * @param {string} token
   * @param {TokenLocation} loc
   * @returns {SizeOverrideToken}
   * @memberof SizeOverrideToken
   */
  static parse(token: string, loc: TokenLocation): SizeOverrideToken {
    const byteSize = InstructionArgSize[R.toUpper(token)];
    if (byteSize)
      return new SizeOverrideToken(token, byteSize, loc.clone());

    return null;
  }
}
