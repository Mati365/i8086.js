import * as R from 'ramda';

import {genUUID} from '@compiler/core/utils/genUUID';
import {appendToMapKeyArray} from '@compiler/core/utils/appendToMapKeyArray';
import {rpn} from '@compiler/rpn/rpn';
import {extractNestableTokensList} from '@compiler/lexer/utils/extractNestableTokensList';
import {joinTokensTexts} from '@compiler/lexer/utils/joinTokensTexts';

import {TokensIterator} from '@compiler/grammar/tree/TokensIterator';
import {
  Token,
  TokenType,
  TokenKind,
} from '@compiler/lexer/tokens';

import {TreeVisitor} from '@compiler/grammar/tree/TreeVisitor';
import {ASTPreprocessorNode, isStatementPreprocessorNode} from '../constants';
import {ASTPreprocessorCallable, ASTPreprocessorStmt, ASTPreprocessorSyntaxLine} from '../nodes';
import {ExpressionResultTreeVisitor} from './ExpressionResultTreeVisitor';
import {PreprocessorGrammarConfig, createPreprocessorGrammar} from '../grammar';
import {
  PreprocessorError,
  PreprocessorErrorCode,
} from '../PreprocessorError';

import {fetchRuntimeCallArgsList} from './utils/fetchRuntimeCallArgsList';

export type InterpreterResult = string | number | boolean | void;

export interface PreprocessorInterpretable {
  exec(interpreter: PreprocessorInterpreter): InterpreterResult;
  toEmitterLine(interpreter?: PreprocessorInterpreter): string;
}

/**
 * Preprocessor function context, contains variables, macros etc
 *
 * @see
 *  nonDefineVariables are defined by EQU and other critical instructions
 *  it is fallback, if defined is later other variable using define overlap it!
 *  it helps with:
 *  abc2: equ 2
 *  %if abc2 > 0
 *
 * @export
 * @class PreprocessorScope
 */
export class PreprocessorScope {
  constructor(
    public readonly variables = new Map<string, InterpreterResult>(),
    public readonly callable = {
      sensitive: new Map<string, ASTPreprocessorCallable[]>(),
      nonSensitive: new Map<string, ASTPreprocessorCallable[]>(),
    },
    public readonly id = genUUID(),
  ) {}
}

/**
 * Store grammar and whole interpreter config
 */
export type PreprocessorInterpreterConfig = {
  grammarConfig: PreprocessorGrammarConfig,
  preExec?: string,
  rootScope?: PreprocessorScope,
};

/**
 * Main interpreter logic
 *
 * @export
 * @class PreprocessorInterpreter
 */
export class PreprocessorInterpreter {
  private _scopes: PreprocessorScope[];

  private _secondPassExec: boolean = false;
  private _secondExecPassNodes: ASTPreprocessorNode[] = [];

  constructor(
    private config: PreprocessorInterpreterConfig,
  ) {
    this._scopes = [
      config.rootScope ?? new PreprocessorScope,
    ];
  }

  get secondPassExec(): boolean {
    return this._secondPassExec;
  }

  get rootScope(): PreprocessorScope {
    return this._scopes[0];
  }

  get currentScope(): PreprocessorScope {
    return R.last(this._scopes);
  }

  /**
   * Pushes node that require precedding nodes
   *
   * @param {ASTPreprocessorNode} node
   * @memberof PreprocessorInterpreter
   */
  appendToSecondPassExec(node: ASTPreprocessorNode): void {
    this._secondExecPassNodes.push(node);
  }

  /**
   * Pushes preprocessor scope on top, exec fn and pops
   *
   * @template R
   * @param {[string, InterpreterResult][]} [variables=[]]
   * @param {(scope: PreprocessorScope) => R} fn
   * @returns {R}
   * @memberof PreprocessorInterpreter
   */
  enterScope<R = void>(
    variables: [string, InterpreterResult][],
    fn: (scope: PreprocessorScope) => R,
  ): R {
    const {_scopes} = this;
    const scope = new PreprocessorScope(
      new Map<string, InterpreterResult>(variables || []),
    );

    _scopes.push(scope);
    const result = fn(scope);
    _scopes.pop();

    return result;
  }

  /**
   * Removes all macros from code
   *
   * @param {string} code
   * @returns {[string, ASTPreprocessorStmt]}
   * @memberof PreprocessorInterpreter
   */
  exec(code: string): [string, ASTPreprocessorStmt] {
    const {config} = this;
    const stmt: ASTPreprocessorStmt = createPreprocessorGrammar(config.grammarConfig).process(code).children[0];

    return [
      this.execTree(stmt),
      stmt,
    ];
  }

  /**
   * Evaluates all macros, replaces them with empty lines
   *
   * @see
   *  Preserves lines numbers but not columns!
   *
   * @param {ASTPreprocessorNode} ast
   * @returns {string}
   * @memberof PreprocessorInterpreter
   */
  execTree(ast: ASTPreprocessorNode): string {
    let acc = '';

    // first phase
    this._secondPassExec = false;
    this._secondExecPassNodes = [];
    ast.exec(this);

    // second phase
    if (this._secondExecPassNodes.length) {
      this._secondPassExec = true;
      R.forEach(
        (node) => {
          node.exec(this);
        },
        this._secondExecPassNodes,
      );
      this._secondExecPassNodes = [];
    }

    const interpreter = this;
    const visitor = new (class extends TreeVisitor<ASTPreprocessorNode> {
      enter(node: ASTPreprocessorNode) {
        if (!isStatementPreprocessorNode(node))
          return;

        if (node instanceof ASTPreprocessorSyntaxLine)
          node.exec(interpreter);

        if (this.nesting === 2) {
          const str = node.toEmitterLine(interpreter);
          if (str)
            acc += `${str}\n`;
        }
      }
    });

    visitor.visit(ast);
    return acc;
  }

  /**
   * Removes macro
   *
   * @param {string} name
   * @param {boolean} [caseIntensive=true]
   * @memberof PreprocessorInterpreter
   */
  undefRuntimeCallable(name: string, caseIntensive: boolean = true): void {
    const {sensitive, nonSensitive} = this.rootScope.callable;

    nonSensitive.delete(name);
    if (caseIntensive)
      sensitive.delete(name);
  }

  /**
   * Declares function that can be executed in ASTPreprocessorSyntaxLine
   *
   * @param {ASTPreprocessorCallable} callable
   * @returns {this}
   * @memberof PreprocessorInterpreter
   */
  defineRuntimeCallable(callable: ASTPreprocessorCallable): this {
    const {rootScope} = this;
    const {caseSensitive} = callable;

    // find duplicates
    const callables = this.getCallables(callable.name, caseSensitive);
    const duplicatedMacro = callables && callables.some((item) => item.argsCount === callable.argsCount);

    // do not redefine inline macro and macro
    if (duplicatedMacro || (callables?.length && !callable.argsCount)) {
      if (duplicatedMacro && !callable.argsCount && callables.length === 1) {
        // allow redefine only if one is defined (one defined = one args set)
        this.undefRuntimeCallable(callable.name, caseSensitive);
      } else {
        // for inline macros allow redefine
        throw new PreprocessorError(
          PreprocessorErrorCode.MACRO_ALREADY_EXISTS,
          null,
          {
            name: callable.name,
          },
        );
      }
    }

    const {sensitive, nonSensitive} = rootScope.callable;
    if (caseSensitive)
      appendToMapKeyArray(callable.name, callable, sensitive);
    else {
      const lowerName = R.toLower(callable.name);
      appendToMapKeyArray(lowerName, callable, nonSensitive);
    }

    return this;
  }

  /**
   * Checks if symbol is callable
   *
   * @param {string} name
   * @param {boolean} [caseSensitive=true]
   * @returns {ASTPreprocessorCallable[]}
   * @memberof PreprocessorInterpreter
   */
  getCallables(name: string, caseIntensive: boolean = true): ASTPreprocessorCallable[] {
    const {sensitive, nonSensitive} = this.rootScope.callable;
    const sensitiveResult = sensitive.get(name);
    if (caseIntensive && sensitiveResult)
      return sensitiveResult;

    const nonSensitiveResult = nonSensitive.get(R.toLower(name));
    if (sensitiveResult && nonSensitiveResult) {
      return [
        ...sensitiveResult,
        ...sensitive.get(name),
      ];
    }

    return sensitiveResult ?? nonSensitiveResult;
  }

  /**
   * Iterates from current scope to rootScope, if not found returns null
   *
   * @param {string} name
   * @param {boolean} [currentScopeOnly=false]
   * @returns {InterpreterResult}
   * @memberof PreprocessorInterpreter
   */
  getVariable(name: string, currentScopeOnly: boolean = false): InterpreterResult {
    const {_scopes} = this;

    for (let i = _scopes.length - 1; i >= 0; --i) {
      const {variables} = _scopes[i];

      if (variables.has(name))
        return variables.get(name);

      if (currentScopeOnly)
        return null;
    }

    return null;
  }

  /**
   * Sets variable with provided name and value in current scope
   *
   * @param {string} name
   * @param {InterpreterResult} value
   * @memberof PreprocessorInterpreter
   */
  setVariable(name: string, value: InterpreterResult): void {
    const {currentScope} = this;

    if (currentScope.variables.has(name)) {
      throw new PreprocessorError(
        PreprocessorErrorCode.VARIABLE_ALREADY_EXISTS_IN_CURRENT_SCOPE,
        null,
        {
          name,
        },
      );
    }

    currentScope.variables.set(name, value);
  }

  /**
   * Removes all macro calls from list of tokens
   *
   * @param {Token[]} tokens
   * @returns {[boolean, Token[]]}
   * @memberof PreprocessorInterpreter
   */
  removeMacrosFromTokens(tokens: Token[]): [boolean, Token[]] {
    const {grammarConfig: {prefixChar}} = this.config;
    let newTokens: Token[] = tokens;
    let inInlineMacroExp = false;

    for (let i = 0; i < newTokens.length; ++i) {
      const [token, nextToken] = [newTokens[i], newTokens[i + 1]];
      const {loc, text, type, kind} = token;

      // handle DUPA%[asdasd]
      // just explode token here and reset offset
      const inlineMacroExpression = (
        text.length > 1
          && R.endsWith(prefixChar, text)
          && nextToken?.text === '['
      );
      if (inlineMacroExpression) {
        newTokens[i] = new Token(TokenType.KEYWORD, null, R.init(text), loc);
        newTokens = R.insert(
          i + 1,
          new Token(TokenType.KEYWORD, null, prefixChar, loc),
          newTokens,
        );
        inInlineMacroExp = true;
        i--; // repeat current loop step
        continue;
      }

      // ignore keywords
      if (type !== TokenType.KEYWORD || (kind !== TokenKind.BRACKET_PREFIX && kind !== null))
        continue;

      // variables, %0
      const variable = this.getVariable(text);
      if (variable !== null) {
        newTokens = R.update(
          i,
          new Token(
            TokenType.KEYWORD,
            null,
            (<any> variable).toString(),
            loc,
          ),
          newTokens,
        );

        continue;
      }

      // catch %0, %1, %[] etc macro inner variables
      if (text[0] === prefixChar) {
        // handle %% which is replaced by scope id
        if (text[1] === prefixChar) {
          newTokens[i] = new Token(
            TokenType.KEYWORD,
            null,
            text.replace(`${prefixChar}${prefixChar}`, `${this.currentScope.id}_`),
            loc,
          );
        } else if (nextToken?.text[0] === '[') {
          // expressions %[]
          const [content, newOffset] = extractNestableTokensList(
            {
              up: (t) => t.text === '[',
              down: (t) => t.text === ']',
            },
            tokens,
            i,
          );

          content.shift(); // drop ]
          content.pop(); // drop [

          // handle case DUPA%[asdasd], DUPA% is the same token
          if (inInlineMacroExp) {
            newTokens = [
              ...newTokens.slice(0, i - 1),
              new Token(
                TokenType.KEYWORD,
                null,
                `${tokens[i - 1]}${this.evalTokensExpression(content).toString()}`,
                loc,
              ),
              ...newTokens.slice(newOffset),
            ];
          } else {
            newTokens = [
              ...newTokens.slice(0, i),
              new Token(
                TokenType.KEYWORD,
                null,
                this.evalTokensExpression(content).toString(),
                loc,
              ),
              ...newTokens.slice(newOffset),
            ];
          }

          i = newOffset;
        }

        continue;
      }

      // catch macros calls
      const callables = this.getCallables(text);
      if (callables?.length) {
        // nested eval of macro, arguments might contain macro
        const it = new TokensIterator(newTokens, i + 1);

        // inline macro calls are generally inside instruction
        // or have no args, example:
        // %define dupa mov
        // dupa ax, bx
        const inline = i > 0 || !callables.some(({argsCount}) => argsCount > 0);
        const bracketCall = newTokens[i + 1]?.text === '('; // handle; abc(2, 3)
        const args = (
          !inline || bracketCall
            ? fetchRuntimeCallArgsList(it, bracketCall ? 1 : 0).map(
              (argTokens) => this.removeMacrosFromTokens(argTokens)[1],
            )
            : []
        );

        const callable = callables.find(
          (item) => item.argsCount === args.length,
        );
        if (callable) {
          const callResult = callable.runtimeCall(
            this,
            R.map(
              (argTokens) => joinTokensTexts('', argTokens),
              args,
            ),
          );

          newTokens = [
            ...newTokens.slice(0, i),
            new Token(
              TokenType.KEYWORD,
              null,
              callResult,
              loc,
            ),
            ...newTokens.slice(it.getTokenIndex() + Math.max(0, +args.length - 1)),
          ];
        }
      }
    }

    return [
      newTokens !== tokens,
      newTokens,
    ];
  }

  /**
   * Evaluates inline
   *
   * @param {Token[]} tokens
   * @returns {number}
   * @memberof PreprocessorInterpreter
   */
  evalTokensExpression(tokens: Token[]): number {
    const expression = joinTokensTexts('', this.removeMacrosFromTokens(tokens)[1]);
    const value = rpn(
      expression,
      {
        keywordResolver: (name) => +this.getVariable(name),
      },
    );

    if (Number.isNaN(value)) {
      throw new PreprocessorError(
        PreprocessorErrorCode.INCORRECT_MATH_EXPRESSION,
        null,
        {
          expression,
        },
      );
    }

    return value;
  }

  /**
   * Evaluates expression used in ifs, loops etc
   *
   * @param {ASTPreprocessorNode} expression
   * @returns {InterpreterResult}
   * @memberof PreprocessorInterpreter
   */
  evalExpression(expression: ASTPreprocessorNode): InterpreterResult {
    const visitor = new ExpressionResultTreeVisitor(this);

    return visitor.visit(expression).value;
  }

  /**
   * Resets interpereter state
   *
   * @memberof PreprocessorInterpreter
   */
  clear() {
    this._scopes = [
      new PreprocessorScope,
    ];
  }
}
