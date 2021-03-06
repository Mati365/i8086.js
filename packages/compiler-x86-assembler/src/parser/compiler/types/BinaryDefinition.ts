import * as R from 'ramda';

import {
  extractBytesFromText,
  extractMultipleNumberBytes,
  toIEEE754Single,
  toIEEE754Double,
  toIEEE754Extended,
} from '@compiler/core/utils';

import {
  Token,
  TokenType,
  NumberToken,
  FloatNumberToken,
} from '@compiler/lexer/tokens';

import {safeKeywordResultRPN} from '../utils';

import {BinaryBlob} from '../BinaryBlob';
import {ASTLabelAddrResolver} from '../../ast/instruction/ASTResolvableArg';
import {ASTDef, DefTokenNames} from '../../ast/def/ASTDef';
import {ParserError, ParserErrorCode} from '../../../shared/ParserError';

export const FLOAT_DEFINE_ENCODERS = {
  [DefTokenNames.DD]: toIEEE754Single,
  [DefTokenNames.DQ]: toIEEE754Double,
  [DefTokenNames.DT]: toIEEE754Extended,
};

/**
 * Transforms token into binary array of numbers
 *
 * @export
 * @param {number} byteSize
 * @param {Token} token
 * @returns {number[]}
 */
export function encodeDefineToken(byteSize: number, token: Token): number[] {
  const buffer: number[] = [];

  switch (token.type) {
    case TokenType.FLOAT_NUMBER: {
      const encoder = FLOAT_DEFINE_ENCODERS[byteSize];
      if (!encoder) {
        throw new ParserError(
          ParserErrorCode.INCORRECT_FLOAT_SIZE,
          token.loc,
          {
            number: token.text,
          },
        );
      }

      buffer.push(
        ...R.reverse(
          encoder((<FloatNumberToken> token).value.number),
        ),
      );
    } break;

    case TokenType.NUMBER:
      buffer.push(
        ...extractMultipleNumberBytes(byteSize, (<NumberToken> token).value.number),
      );
      break;

    case TokenType.QUOTE: {
      const binText = extractBytesFromText(1, token.text);
      const rounedByfferOutputSize = Math.ceil(binText.length / byteSize) * byteSize;

      buffer.push(
        ...binText,
        ...(new Array(rounedByfferOutputSize - binText.length).fill(0)),
      );
    } break;

    // needs to be resolved in second pass
    case TokenType.BRACKET:
    case TokenType.KEYWORD:
      buffer.push(
        ...new Array(byteSize).fill(null),
      );
      break;

    default:
      throw new ParserError(
        ParserErrorCode.UNSUPPORTED_DEFINE_TOKEN,
        token.loc,
        {
          token: token.text,
        },
      );
  }

  return buffer;
}

/**
 * Define binary set of data
 *
 * @export
 * @class BinaryDefinition
 * @extends {BinaryBlob<ASTDef>}
 */
export class BinaryDefinition extends BinaryBlob<ASTDef> {
  private _unresolvedOffsets: number[] = [];

  get unresolvedOffsets() { return this._unresolvedOffsets; }

  /**
   * Returns true after compile() methods returns any null value.
   * Null value occurs when parser is not able to resolve keyword
   * with label for example
   *
   * @returns {boolean}
   * @memberof BinaryDefinition
   */
  hasUnresolvedDefinitions(): boolean {
    return this._unresolvedOffsets.length > 0;
  }

  /**
   * Search in binary for all null placeholder values
   * and appends them to _unresolvedOffsets
   *
   * @private
   * @returns {number[]}
   * @memberof BinaryDefinition
   */
  private collectUnresolvedOffsets(): number[] {
    const {
      binary,
      ast: {byteSize},
    } = this;

    const offsets: number[] = [];

    for (let i = 0; i < binary.length;) {
      if (binary[i] === null) {
        offsets.push(i);
        i += byteSize;
      } else
        ++i;
    }

    return offsets;
  }

  /**
   * Compiles set of data into binary stream
   *
   * @returns {BinaryDefinition}
   * @memberof BinaryDefinition
   */
  compile(): BinaryDefinition {
    const {ast: {args, byteSize}} = this;
    const binary: number[] = [];

    R.forEach(
      (arg) => {
        binary.push(...encodeDefineToken(byteSize, arg));
      },
      args,
    );

    this._binary = binary;
    this._unresolvedOffsets = this.collectUnresolvedOffsets();

    return this;
  }

  /**
   * Tries to execute all binary offsets
   *
   * @param {ASTLabelAddrResolver} labelResolver
   * @returns {boolean}
   * @memberof BinaryDefinition
   */
  tryResolveOffsets(labelResolver: ASTLabelAddrResolver): boolean {
    const {
      _binary,
      _unresolvedOffsets,
      ast: {args, byteSize},
    } = this;

    for (let offsetIndex = 0; offsetIndex < _unresolvedOffsets.length;) {
      const offset = _unresolvedOffsets[offsetIndex];
      const argIndex = (offset / byteSize) | 0;

      const result = safeKeywordResultRPN(
        {
          keywordResolver: labelResolver,
        },
        args[argIndex].text,
      );

      if (!result.isOk()) {
        ++offsetIndex;
        continue;
      }

      const offsetBytes = extractMultipleNumberBytes(byteSize, result.unwrap());
      for (let i = 0; i < offsetBytes.length; ++i)
        _binary[offset + i] = offsetBytes[i];

      _unresolvedOffsets.splice(offsetIndex, 1);
    }

    return !_unresolvedOffsets.length;
  }
}
