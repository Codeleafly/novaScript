
// src/frontend/parser.ts

import { 
    Statement, Program, Expression, BinaryExpr, NumericLiteral, Identifier, 
    VarDeclaration, AssignmentExpr, CallExpr, FunctionDeclaration, IfStatement, 
    WhileStatement, MemberExpr, ObjectLiteral, Property, StringLiteral, 
    ReturnStatement, ArrayLiteral, ForStatement, ImportStatement, ImportExpr, NodeType,
    GlobalDeclaration
} from "./ast";
import { tokenize, Token, TokenType } from "./lexer";
import { NovaSyntaxError, ErrorLocation } from "../runtime/errors";

export default class Parser {
  private tokens: Token[] = [];
  private filename: string = "repl";
  private source: string = "";

  private not_eof(): boolean {
    return this.tokens[0].type !== TokenType.EOF;
  }

  private at(): Token {
    return this.tokens[0] as Token;
  }

  private eat(): Token {
    return this.tokens.shift() as Token;
  }

  private getLocation(token: Token): ErrorLocation {
      return {
          file: this.filename,
          line: token.line,
          column: token.column,
          source: this.source
      };
  }

  private expect(type: TokenType, err: string): Token {
    const prev = this.tokens.shift() as Token;
    if (!prev || prev.type !== type) {
      throw new NovaSyntaxError(
          `${err}. Expected ${TokenType[type]} but found ${prev ? TokenType[prev.type] : "EOF"} ('${prev?.value}')`,
          this.getLocation(prev || { line: 0, column: 0, type: TokenType.EOF, value: "" } as any)
      );
    }
    return prev;
  }

  public produceAST(sourceCode: string, filename: string = "repl"): Program {
    this.source = sourceCode;
    this.filename = filename;
    this.tokens = tokenize(sourceCode);
    const program: Program = {
      kind: "Program",
      body: [],
      line: 1,
      column: 1,
      file: filename
    };

    while (this.not_eof()) {
      program.body.push(this.parse_statement());
    }

    this.attach_file(program);
    return program;
  }

  private attach_file(node: any) {
      if (!node || typeof node !== "object") return;
      if (node.kind && !node.file) node.file = this.filename;
      for (const key in node) {
          if (Array.isArray(node[key])) {
              for (const child of node[key]) this.attach_file(child);
          } else if (typeof node[key] === "object") {
              this.attach_file(node[key]);
          }
      }
  }

  private parse_statement(): Statement {
    switch (this.at().type) {
      case TokenType.Let:
      case TokenType.Const:
        return this.parse_var_declaration();
      case TokenType.Global:
        return this.parse_global_declaration();
      case TokenType.Fn:
        return this.parse_function_declaration();
      case TokenType.If:
        return this.parse_if_statement();
      case TokenType.While:
        return this.parse_while_statement();
      case TokenType.For:
        return this.parse_for_statement();
      case TokenType.Return:
        return this.parse_return_statement();
      case TokenType.OpenBrace:
          return this.parse_block();
      default:
        return this.parse_expression();
    }
  }

  private parse_block(): Statement {
      const openBrace = this.expect(TokenType.OpenBrace, "Expected { to start block");
      const body: Statement[] = [];
      while (this.at().type !== TokenType.CloseBrace && this.not_eof()) {
          body.push(this.parse_statement());
      }
      this.expect(TokenType.CloseBrace, "Expected } to end block");
      return { kind: "Program", body, line: openBrace.line, column: openBrace.column } as any;
  }

  private parse_return_statement(): Statement {
      const returnToken = this.eat();
      const value = this.is_start_of_expression(this.at().type) ? this.parse_expression() : undefined;
      return { kind: "ReturnStatement", value, line: returnToken.line, column: returnToken.column } as ReturnStatement;
  }

  private parse_while_statement(): Statement {
      const whileToken = this.eat();
      const hasParen = this.at().type === TokenType.OpenParen;
      if (hasParen) this.eat();
      const condition = this.parse_expression();
      if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after condition");
      const bodyNode = this.parse_statement();
      const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
      return { kind: "WhileStatement", condition, body, line: whileToken.line, column: whileToken.column } as WhileStatement;
  }

  private parse_for_statement(): Statement {
      const forToken = this.eat();
      const hasParen = this.at().type === TokenType.OpenParen;
      if (hasParen) this.eat();
      const identifier = this.expect(TokenType.Identifier, "Expected identifier in for loop").value;
      this.expect(TokenType.From, "Expected 'from' in for loop");
      const start = this.parse_expression();
      this.expect(TokenType.To, "Expected 'to' in for loop");
      const end = this.parse_expression();
      if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after for range");
      const bodyNode = this.parse_statement();
      const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
      return { kind: "ForStatement", counter: identifier, start, end, body, line: forToken.line, column: forToken.column } as ForStatement;
  }

  private parse_if_statement(): Statement {
      const ifToken = this.eat();
      this.expect(TokenType.OpenParen, "Expected ( after if");
      const condition = this.parse_expression();
      this.expect(TokenType.CloseParen, "Expected ) after condition");
      const thenNode = this.parse_statement();
      const thenBranch = thenNode.kind === "Program" ? (thenNode as any).body : [thenNode];
      let elseBranch: Statement[] | undefined = undefined;
      if (this.at().type === TokenType.Else) {
          this.eat();
          const elseNode = this.parse_statement();
          elseBranch = elseNode.kind === "Program" ? (elseNode as any).body : [elseNode];
      }
      return { kind: "IfStatement", condition, thenBranch, elseBranch, line: ifToken.line, column: ifToken.column } as IfStatement;
  }

  private parse_function_declaration(): Statement {
      const fnToken = this.eat();
      const name = this.expect(TokenType.Identifier, "Expected function name").value;
      this.expect(TokenType.OpenParen, "Expected ( after function name");
      const args: string[] = [];
      while (this.at().type === TokenType.Identifier) {
          args.push(this.eat().value);
          if (this.at().type === TokenType.Comma) this.eat();
      }
      this.expect(TokenType.CloseParen, "Expected ) after function parameters");
      const bodyNode = this.parse_statement();
      const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
      return { kind: "FunctionDeclaration", name, parameters: args, body, line: fnToken.line, column: fnToken.column } as FunctionDeclaration;
  }

  private parse_global_declaration(): Statement {
    const tk = this.eat(); // consume 'global'
    const isConstant = false; // global const uses 'const global' — for now always mutable
    const identifier = this.expect(TokenType.Identifier, "Expected identifier name after 'global'.").value;
    if (this.at().type === TokenType.Assign) {
      this.eat();
      const value = this.parse_expression();
      return { kind: "GlobalDeclaration", constant: isConstant, identifier, value, line: tk.line, column: tk.column } as GlobalDeclaration;
    }
    return { kind: "GlobalDeclaration", constant: false, identifier, value: undefined, line: tk.line, column: tk.column } as GlobalDeclaration;
  }

  private parse_var_declaration(): Statement {
    const tk = this.eat();
    const isConstant = tk.type === TokenType.Const;
    const identifier = this.expect(TokenType.Identifier, "Expected identifier name.").value;
    if (this.at().type === TokenType.Assign) {
      this.eat();
      const value = this.parse_expression();
      return { kind: "VarDeclaration", constant: isConstant, identifier, value, line: tk.line, column: tk.column } as VarDeclaration;
    }
    if (isConstant) throw new NovaSyntaxError("Must assign value to constant.", this.getLocation(this.at()));
    return { kind: "VarDeclaration", constant: false, identifier, value: undefined, line: tk.line, column: tk.column } as VarDeclaration;
  }

  private parse_expression(): Expression {
    return this.parse_assignment_expr();
  }

  private parse_assignment_expr(): Expression {
    const left = this.parse_object_expr();
    if (this.at().type === TokenType.Assign) {
      this.eat();
      const value = this.parse_assignment_expr();
      return { kind: "AssignmentExpr", assignee: left, value, line: left.line, column: left.column } as AssignmentExpr;
    }
    return left;
  }

  private parse_object_expr(): Expression {
      if (this.at().type !== TokenType.OpenBrace) return this.parse_logical_or_expr();
      const openBrace = this.eat();
      const properties: Property[] = [];
      while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
          const keyToken = this.expect(TokenType.Identifier, "Object key expected.");
          const key = keyToken.value;
          let value: Expression | undefined;
          if (this.at().type === TokenType.Assign) {
              this.eat();
              value = this.parse_expression();
          }
          properties.push({ kind: "Property", key, value, line: keyToken.line, column: keyToken.column });
          if (this.at().type !== TokenType.CloseBrace) {
              this.expect(TokenType.Comma, "Expected comma or closing brace.");
          }
      }
      this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");
      return { kind: "ObjectLiteral", properties, line: openBrace.line, column: openBrace.column } as ObjectLiteral;
  }

  private parse_logical_or_expr(): Expression {
      let left = this.parse_logical_and_expr();
      while(this.at().type === TokenType.Or) {
          const opToken = this.eat();
          const right = this.parse_logical_and_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_logical_and_expr(): Expression {
      let left = this.parse_equality_expr();
      while(this.at().type === TokenType.And) {
          const opToken = this.eat();
          const right = this.parse_equality_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_equality_expr(): Expression {
      let left = this.parse_relational_expr();
      while(this.at().type === TokenType.Is || this.at().type === TokenType.Isnt || this.at().type === TokenType.Equals || this.at().type === TokenType.NotEquals) {
          const opToken = this.eat();
          const right = this.parse_relational_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_relational_expr(): Expression {
      let left = this.parse_additive_expr();
      while(this.at().type === TokenType.LessThan || this.at().type === TokenType.GreaterThan) {
          const opToken = this.eat();
          const right = this.parse_additive_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_additive_expr(): Expression {
    let left = this.parse_multiplicative_expr();
    while (this.at().type === TokenType.Plus || this.at().type === TokenType.Minus) {
      const opToken = this.eat();
      const right = this.parse_multiplicative_expr();
      left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
    }
    return left;
  }

  private parse_multiplicative_expr(): Expression {
    let left = this.parse_unary_expr();
    while (this.at().type === TokenType.Times || this.at().type === TokenType.Slash || this.at().type === TokenType.Percent) {
      const opToken = this.eat();
      const right = this.parse_unary_expr();
      left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
    }
    return left;
  }

  private parse_unary_expr(): Expression {
      if (this.at().type === TokenType.Minus || this.at().type === TokenType.Not) {
          const opToken = this.eat();
          const arg = this.parse_unary_expr();
          return { kind: "BinaryExpr", left: arg, right: { kind: "NumericLiteral", value: 0 } as any, operator: "unary_" + opToken.value, line: opToken.line, column: opToken.column } as any;
      }
      return this.parse_call_member_expr();
  }

  private parse_call_member_expr(): Expression {
      const member = this.parse_member_expr();
      if (this.at().type === TokenType.OpenParen) {
          return this.parse_call_expr(member);
      }
      return member;
  }

  private parse_call_expr(caller: Expression): Expression {
    const openParen = this.eat();
    const args = this.at().type === TokenType.CloseParen ? [] : this.parse_arguments_list();
    this.expect(TokenType.CloseParen, "Missing closing parenthesis in call expression.");
    return { kind: "CallExpr", caller, args, line: openParen.line, column: openParen.column } as CallExpr;
  }

  private parse_arguments_list(): Expression[] {
      const args = [this.parse_expression()];
      while (this.at().type === TokenType.Comma && this.eat()) {
          args.push(this.parse_expression());
      }
      return args;
  }

  private parse_member_expr(): Expression {
      let object = this.parse_primary_expr();
      while (this.at().type === TokenType.Dot || this.at().type === TokenType.OpenBracket) {
          const operator = this.eat();
          let property: Expression;
          let computed: boolean;

          if (operator.type === TokenType.Dot) {
              computed = false;
              property = this.parse_primary_expr();
              if (property.kind !== "Identifier") {
                  throw new NovaSyntaxError("Cannot use dot operator without identifier.", this.getLocation(this.at()));
              }
          } else {
              computed = true;
              property = this.parse_expression();
              this.expect(TokenType.CloseBracket, "Missing closing bracket in computed property.");
          }

          object = { kind: "MemberExpr", object, property, computed, line: operator.line, column: operator.column } as MemberExpr;
      }
      return object;
  }

  private parse_array_expr(): Expression {
      const openBracket = this.eat();
      const elements: Expression[] = [];
      while (this.at().type !== TokenType.CloseBracket && this.not_eof()) {
          elements.push(this.parse_expression());
          if (this.at().type === TokenType.Comma) this.eat();
      }
      this.expect(TokenType.CloseBracket, "Expected ] after array literal.");
      return { kind: "ArrayLiteral", elements, line: openBracket.line, column: openBracket.column } as ArrayLiteral;
  }

  private parse_primary_expr(): Expression {
    const tk = this.at();
    switch (tk.type) {
      case TokenType.Identifier:
        return { kind: "Identifier", symbol: this.eat().value, line: tk.line, column: tk.column } as Identifier;
      case TokenType.Number:
        return { kind: "NumericLiteral", value: parseFloat(this.eat().value), line: tk.line, column: tk.column } as NumericLiteral;
      case TokenType.String:
        return { kind: "StringLiteral", value: this.eat().value, line: tk.line, column: tk.column } as StringLiteral;
      case TokenType.Include:
          const includeToken = this.eat();
          this.expect(TokenType.OpenParen, "Expected ( after include keyword.");
          const moduleToken = this.expect(TokenType.String, "Expected string module name in include().");
          this.expect(TokenType.CloseParen, "Expected ) after module name in include().");
          return { kind: "ImportExpr", moduleName: moduleToken.value, line: includeToken.line, column: includeToken.column } as ImportExpr;
      case TokenType.OpenParen: {
        this.eat();
        const value = this.parse_expression();
        this.expect(TokenType.CloseParen, "Expected closing parenthesis.");
        return value;
      }
      case TokenType.OpenBracket:
          return this.parse_array_expr();
      default:
        throw new NovaSyntaxError(`Unexpected token found: ${tk.value}`, this.getLocation(tk));
    }
  }
  
  private is_start_of_expression(type: TokenType): boolean {
      return type === TokenType.Identifier || type === TokenType.Number || type === TokenType.String || 
             type === TokenType.OpenParen || type === TokenType.OpenBrace || type === TokenType.OpenBracket || 
             type === TokenType.Minus || type === TokenType.Not || type === TokenType.Include;
  }
}
