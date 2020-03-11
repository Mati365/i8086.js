import * as R from 'ramda';

import {Token} from '@compiler/lexer/tokens';

import {ParserError, ParserErrorCode} from '../../../shared/ParserError';
import {ASTParser, ASTTree} from '../ASTParser';
import {ASTNodeKind} from '../types';
import {
  ASTNodeLocation,
  KindASTNode,
} from '../ASTNode';

import {isTokenInstructionBeginning} from '../instruction/ASTInstruction';
import {isLineTerminatorToken} from '../../utils';

import {tokenDefSize} from '../def/ASTDef';

export const TIMES_TOKEN_NAME = 'times';

/**
 * Instruction that repeats instruction
 *
 * @export
 * @class ASTTimes
 * @extends {KindASTNode(ASTNodeKind.TIMES)}
 */
export class ASTTimes extends KindASTNode(ASTNodeKind.TIMES) {
  constructor(
    public readonly timesExpression: Token[],
    public readonly repatedNodesTree: ASTTree,
    loc: ASTNodeLocation,
  ) {
    super(loc);
  }

  toString(): string {
    return `${TIMES_TOKEN_NAME} ${this.timesExpression.join('')}`;
  }

  /**
   * Parses line - consumes expression unless catch any instruction beginning
   *
   * @static
   * @param {Token} token
   * @param {ASTParser} parser
   * @returns {ASTTimes}
   * @memberof ASTTimes
   */
  static parse(token: Token, parser: ASTParser): ASTTimes {
    if (token.lowerText !== TIMES_TOKEN_NAME)
      return null;

    const timesExpression: Token[] = [];
    let repeatedNodeTokens: Token[] = null;

    // divide line tokens into times expression and repeated node expression
    do {
      const argToken = parser.fetchRelativeToken();
      if (!argToken)
        break;

      if (!repeatedNodeTokens && (isTokenInstructionBeginning(argToken) || tokenDefSize(argToken)))
        repeatedNodeTokens = [argToken];
      else if (isLineTerminatorToken(argToken))
        break;
      else
        (repeatedNodeTokens || timesExpression).push(argToken);
    } while (true);

    // handle errors
    if (!timesExpression.length)
      throw new ParserError(ParserErrorCode.INCORRECT_TIMES_ARGS_COUNT, token.loc);

    if (!repeatedNodeTokens?.length)
      throw new ParserError(ParserErrorCode.MISSING_TIMES_REPEATED_INSTRUCTION, token.loc);

    // try generate AST for repeated instruction
    const repatedNodesTreeResult = (
      parser
        .fork(repeatedNodeTokens)
        .getTree()
    );

    if (repatedNodesTreeResult.isOk()) {
      const repatedNodesTree = repatedNodesTreeResult.unwrap();

      if (!repatedNodesTree?.astNodes?.[0]) {
        throw new ParserError(
          ParserErrorCode.UNABLE_PARSE_REPEATED_INSTRUCTION,
          token.loc,
          {
            expression: R.compose(
              R.join(' '),
              R.pluck('text'),
            )(repeatedNodeTokens),
          },
        );
      }

      return new ASTTimes(
        timesExpression,
        repatedNodesTree,
        ASTNodeLocation.fromTokenLoc(token.loc),
      );
    }

    // raise error, it should be single error because single instruction
    throw repatedNodesTreeResult.unwrapErr()[0];
  }
}
