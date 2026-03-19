
// src/frontend/ast.ts

export type NodeType = 
  | "Program"
  | "VarDeclaration"
  | "GlobalDeclaration"
  | "FunctionDeclaration"
  | "IfStatement"
  | "WhileStatement"
  | "ForStatement"
  | "SwitchStatement"
  | "CaseStatement"
  | "TryCatchStatement"
  | "ReturnStatement"
  | "ThrowStatement"
  | "BreakStatement"
  | "ContinueStatement"
  | "ImportStatement"
  | "ImportExpr"
  | "AssignmentExpr"
  | "BinaryExpr"
  | "CallExpr"
  | "MemberExpr"
  | "AwaitExpr"
  | "Identifier"
  | "NumericLiteral"
  | "StringLiteral"
  | "ObjectLiteral"
  | "Property"
  | "ArrayLiteral";

export interface Statement {
  kind: NodeType;
  line?: number;
  column?: number;
  file?: string;
}

export interface Program extends Statement {
  kind: "Program";
  body: Statement[];
}

export interface VarDeclaration extends Statement {
  kind: "VarDeclaration";
  constant: boolean;
  identifier: string;
  value?: Expression;
}

export interface GlobalDeclaration extends Statement {
  kind: "GlobalDeclaration";
  constant: boolean;
  identifier: string;
  value?: Expression;
}

export interface FunctionDeclaration extends Statement {
  kind: "FunctionDeclaration";
  name: string;
  parameters: string[];
  body: Statement[];
  async: boolean;
}

export interface IfStatement extends Statement {
  kind: "IfStatement";
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface WhileStatement extends Statement {
  kind: "WhileStatement";
  condition: Expression;
  body: Statement[];
}

export interface ForStatement extends Statement {
    kind: "ForStatement";
    counter: string;
    start: Expression;
    end: Expression;
    body: Statement[];
}

export interface SwitchStatement extends Statement {
    kind: "SwitchStatement";
    discriminant: Expression;
    cases: CaseStatement[];
    default?: Statement[];
}

export interface CaseStatement extends Statement {
    kind: "CaseStatement";
    test: Expression;
    consequent: Statement[];
}

export interface TryCatchStatement extends Statement {
    kind: "TryCatchStatement";
    body: Statement[];
    catchParameter?: string;
    catchBlock: Statement[];
    finallyBlock?: Statement[];
}

export interface ReturnStatement extends Statement {
  kind: "ReturnStatement";
  value?: Expression;
}

export interface ThrowStatement extends Statement {
    kind: "ThrowStatement";
    argument: Expression;
}

export interface BreakStatement extends Statement {
    kind: "BreakStatement";
}

export interface ContinueStatement extends Statement {
    kind: "ContinueStatement";
}

export interface ImportStatement extends Statement {
    kind: "ImportStatement";
    moduleName: string;
}

export interface ImportExpr extends Expression {
    kind: "ImportExpr";
    moduleName: string;
}

export interface Expression extends Statement {}

export interface AssignmentExpr extends Expression {
  kind: "AssignmentExpr";
  assignee: Expression; // Usually Identifier or MemberExpr
  value: Expression;
}

export interface BinaryExpr extends Expression {
  kind: "BinaryExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface CallExpr extends Expression {
  kind: "CallExpr";
  args: Expression[];
  caller: Expression;
}

export interface MemberExpr extends Expression {
  kind: "MemberExpr";
  object: Expression;
  property: Expression; // Identifier or String
  computed: boolean; // if true, object[property]. if false, object.property
}

export interface AwaitExpr extends Expression {
    kind: "AwaitExpr";
    argument: Expression;
}

export interface Identifier extends Expression {
  kind: "Identifier";
  symbol: string;
}

export interface NumericLiteral extends Expression {
  kind: "NumericLiteral";
  value: number;
}

export interface StringLiteral extends Expression {
  kind: "StringLiteral";
  value: string;
}

export interface Property extends Expression {
  kind: "Property";
  key: string;
  value?: Expression; // Optional because { key } shorthand could exist, or `name "Alice"` style
}

export interface ObjectLiteral extends Expression {
  kind: "ObjectLiteral";
  properties: Property[];
}

export interface ArrayLiteral extends Expression {
  kind: "ArrayLiteral";
  elements: Expression[];
}
