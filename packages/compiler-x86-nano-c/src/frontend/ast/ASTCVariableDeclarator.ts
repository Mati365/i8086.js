import {NodeLocation} from '@compiler/grammar/tree/NodeLocation';
import {ASTCCompilerNode, ASTCCompilerKind} from './ASTCCompilerNode';
import {ASTCType} from './ASTCType';

/**
 * List of declarations variables with the same type
 *
 * @export
 * @class ASTCVariableDeclarator
 * @extends {ASTCCompilerNode}
 */
export class ASTCVariableDeclarator extends ASTCCompilerNode {
  constructor(
    loc: NodeLocation,
    declarations: ASTCCompilerNode[],
  ) {
    super(ASTCCompilerKind.VariableDeclarator, loc, declarations);
  }
}

/**
 * Single variable declaration
 *
 * @export
 * @class ASTCVariableDeclaration
 * @extends {ASTCCompilerNode}
 */
export class ASTCVariableDeclaration extends ASTCCompilerNode {
  constructor(
    loc: NodeLocation,
    public readonly type: ASTCType,
    public readonly name: string,
    public readonly expression: ASTCCompilerNode = null,
  ) {
    super(ASTCCompilerKind.VariableDeclaration, loc);
  }

  toString() {
    const {type, kind, name, expression} = this;

    return `${kind} type="${type}" name="${name}" expression="${expression || ''}"`;
  }
}
