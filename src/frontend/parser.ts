
// src/frontend/parser.ts

import { 
    Statement, Program, Expression, BinaryExpr, NumericLiteral, Identifier, 
    VarDeclaration, AssignmentExpr, CallExpr, FunctionDeclaration, IfStatement, 
    WhileStatement, MemberExpr, ObjectLiteral, Property, StringLiteral, 
    ReturnStatement, ArrayLiteral, ForStatement, ImportStatement, ImportExpr, NodeType,
    GlobalDeclaration, SwitchStatement, CaseStatement, TryCatchStatement, ThrowStatement,
    BreakStatement, ContinueStatement, AwaitExpr, ArrowFnExpr, ExportDeclaration, NamedImportStatement
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

  private peek(offset: number = 0): Token {
      return (this.tokens[offset] || { type: TokenType.EOF, value: "EOF" }) as Token;
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
      case TokenType.Async:
      case TokenType.Fn:
        return this.parse_function_declaration();
      case TokenType.If:
        return this.parse_if_statement();
      case TokenType.While:
        return this.parse_while_statement();
      case TokenType.For:
        return this.parse_for_statement();
      case TokenType.Switch:
        return this.parse_switch_statement();
      case TokenType.Try:
        return this.parse_try_catch_statement();
      case TokenType.Return:
        return this.parse_return_statement();
      case TokenType.Throw:
        return this.parse_throw_statement();
      case TokenType.Break:
        return this.parse_break_statement();
      case TokenType.Continue:
        return this.parse_continue_statement();
      case TokenType.OpenBrace:
          return this.parse_block();
      case TokenType.Export:
          return this.parse_export_declaration();
      case TokenType.Include:
          // Handle include as statement if at statement level (import "mod" form)
          if (this.peek(1).type === TokenType.OpenBrace) {
              return this.parse_named_import();
          }
          // fallthrough to expression
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

      // Determine style: Nova-style "for i from 0 to 10" vs JS-style "for (let i=0; i<10; i++)"
      const isNovaStyle = this.at().type === TokenType.Identifier && this.peek(1).type === TokenType.From;

      if (isNovaStyle) {
          const identifier = this.expect(TokenType.Identifier, "Expected identifier in for loop").value;
          this.expect(TokenType.From, "Expected 'from' in for loop");
          const start = this.parse_expression();
          this.expect(TokenType.To, "Expected 'to' in for loop");
          const end = this.parse_expression();
          if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after for range");
          const bodyNode = this.parse_statement();
          const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
          return { kind: "ForStatement", counter: identifier, start, end, body, line: forToken.line, column: forToken.column } as ForStatement;
      } else {
          // JS-style: for (init; condition; update)
          const init = this.at().type === TokenType.SemiColon ? undefined : this.parse_statement();
          this.expect(TokenType.SemiColon, "Expected ; after for init");
          
          const condition = this.at().type === TokenType.SemiColon ? undefined : this.parse_expression();
          this.expect(TokenType.SemiColon, "Expected ; after for condition");
          
          const update = (hasParen ? this.at().type === TokenType.CloseParen : false) ? undefined : this.parse_expression();
          if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after for header");
          
          const bodyNode = this.parse_statement();
          const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
          return { kind: "ForStatement", init, condition, update, body, line: forToken.line, column: forToken.column } as ForStatement;
      }
  }

  private parse_if_statement(): Statement {
      const ifToken = this.eat();
      const hasParen = this.at().type === TokenType.OpenParen;
      if (hasParen) this.eat();
      const condition = this.parse_expression();
      if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after condition");
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
      let isAsync = false;
      if (this.at().type === TokenType.Async) {
          this.eat();
          isAsync = true;
      }
      const fnToken = this.expect(TokenType.Fn, "Expected 'fn' keyword after 'async' (or alone)");
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
      return { kind: "FunctionDeclaration", name, parameters: args, body, async: isAsync, line: fnToken.line, column: fnToken.column } as FunctionDeclaration;
  }

  private parse_switch_statement(): Statement {
      const switchToken = this.eat();
      const hasParen = this.at().type === TokenType.OpenParen;
      if (hasParen) this.eat();
      const discriminant = this.parse_expression();
      if (hasParen) this.expect(TokenType.CloseParen, "Expected ) after switch expression");
      
      this.expect(TokenType.OpenBrace, "Expected { to start switch block");
      const cases: CaseStatement[] = [];
      let defaultBlock: Statement[] | undefined = undefined;

      while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
          if (this.at().type === TokenType.Case) {
              const caseToken = this.eat();
              const test = this.parse_expression();
              this.expect(TokenType.OpenBrace, "Expected { after case value");
              const consequent: Statement[] = [];
              while (this.at().type !== TokenType.CloseBrace && this.not_eof()) {
                  consequent.push(this.parse_statement());
              }
              this.expect(TokenType.CloseBrace, "Expected } to end case block");
              cases.push({ kind: "CaseStatement", test, consequent, line: caseToken.line, column: caseToken.column });
          } else if (this.at().type === TokenType.Default) {
              this.eat();
              this.expect(TokenType.OpenBrace, "Expected { after default keyword");
              defaultBlock = [];
              while (this.at().type !== TokenType.CloseBrace && this.not_eof()) {
                  defaultBlock.push(this.parse_statement());
              }
              this.expect(TokenType.CloseBrace, "Expected } to end default block");
          } else {
              throw new NovaSyntaxError(`Unexpected token in switch: ${this.at().value}`, this.getLocation(this.at()));
          }
      }
      this.expect(TokenType.CloseBrace, "Expected } to end switch block");
      return { kind: "SwitchStatement", discriminant, cases, default: defaultBlock, line: switchToken.line, column: switchToken.column } as SwitchStatement;
  }

  private parse_try_catch_statement(): Statement {
      const tryToken = this.eat();
      const bodyNode = this.parse_block();
      const body = (bodyNode as any).body;
      
      let catchParameter: string | undefined = undefined;
      let catchBlock: Statement[] = [];
      let finallyBlock: Statement[] | undefined = undefined;

      if (this.at().type === TokenType.Catch) {
          this.eat();
          if (this.at().type === TokenType.OpenParen) {
              this.eat();
              catchParameter = this.expect(TokenType.Identifier, "Expected identifier for catch parameter").value;
              this.expect(TokenType.CloseParen, "Expected ) after catch parameter");
          } else if (this.at().type === TokenType.Identifier) {
              catchParameter = this.eat().value;
          }
          const catchNode = this.parse_block();
          catchBlock = (catchNode as any).body;
      }

      if (this.at().type === TokenType.Finally) {
          this.eat();
          const finallyNode = this.parse_block();
          finallyBlock = (finallyNode as any).body;
      }

      if (catchBlock.length === 0 && !finallyBlock) {
          throw new NovaSyntaxError("Try statement must have a catch or finally block", this.getLocation(tryToken));
      }

      return { kind: "TryCatchStatement", body, catchParameter, catchBlock, finallyBlock, line: tryToken.line, column: tryToken.column } as TryCatchStatement;
  }

  private parse_throw_statement(): Statement {
      const throwToken = this.eat();
      const argument = this.parse_expression();
      return { kind: "ThrowStatement", argument, line: throwToken.line, column: throwToken.column } as ThrowStatement;
  }

  private parse_break_statement(): Statement {
      const breakToken = this.eat();
      return { kind: "BreakStatement", line: breakToken.line, column: breakToken.column } as BreakStatement;
  }

  private parse_continue_statement(): Statement {
      const continueToken = this.eat();
      return { kind: "ContinueStatement", line: continueToken.line, column: continueToken.column } as ContinueStatement;
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
    const left = this.parse_null_coalesce_expr();
    if (this.at().type === TokenType.Assign || this.at().type === TokenType.PlusEquals || this.at().type === TokenType.MinusEquals) {
      const opToken = this.eat();
      const value = this.parse_assignment_expr();
      
      if (opToken.type === TokenType.PlusEquals || opToken.type === TokenType.MinusEquals) {
          // Desugar += and -= to BinaryExpr
          const op = opToken.type === TokenType.PlusEquals ? "+" : "-";
          const binary: BinaryExpr = { kind: "BinaryExpr", left, right: value, operator: op, line: opToken.line, column: opToken.column };
          return { kind: "AssignmentExpr", assignee: left, value: binary, line: left.line, column: left.column } as AssignmentExpr;
      }
      
      return { kind: "AssignmentExpr", assignee: left, value, line: left.line, column: left.column } as AssignmentExpr;
    }
    return left;
  }

  private parse_null_coalesce_expr(): Expression {
      let left = this.parse_object_expr();
      while (this.at().type === TokenType.NullCoalesce) {
          const opToken = this.eat();
          const right = this.parse_object_expr();
          left = { kind: "BinaryExpr", left, right, operator: "??", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_object_expr(): Expression {
      if (this.at().type !== TokenType.OpenBrace) return this.parse_logical_or_expr();
      const openBrace = this.eat(); // {
      const properties: Property[] = [];

      while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
          // Key can be Identifier or String
          const keyToken = this.eat();
          if (keyToken.type !== TokenType.Identifier && keyToken.type !== TokenType.String) {
              throw new NovaSyntaxError("Object key must be identifier or string", this.getLocation(keyToken));
          }
          const key = keyToken.value;

          // Support ':' or '=' separator
          if (this.at().type !== TokenType.Colon && this.at().type !== TokenType.Assign) {
              throw new NovaSyntaxError("Expected : or = after object key", this.getLocation(this.at()));
          }
          this.eat(); // consume : or =

          const value = this.parse_expression();
          properties.push({ kind: "Property", key, value, line: keyToken.line, column: keyToken.column });

          if (this.at().type === TokenType.Comma) {
              this.eat();
          }
      }
      this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");
      return { kind: "ObjectLiteral", properties, line: openBrace.line, column: openBrace.column } as ObjectLiteral;
  }

  private parse_logical_or_expr(): Expression {
      let left = this.parse_logical_and_expr();
      while(this.at().type === TokenType.Or || this.at().type === TokenType.OrLogic) {
          const opToken = this.eat();
          const right = this.parse_logical_and_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value || "||", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_logical_and_expr(): Expression {
      let left = this.parse_bitwise_or_expr();
      while(this.at().type === TokenType.And || this.at().type === TokenType.AndLogic) {
          const opToken = this.eat();
          const right = this.parse_bitwise_or_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value || "&&", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_bitwise_or_expr(): Expression {
      let left = this.parse_bitwise_xor_expr();
      while (this.at().type === TokenType.Pipe) {
          const opToken = this.eat();
          const right = this.parse_bitwise_xor_expr();
          left = { kind: "BinaryExpr", left, right, operator: "|", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_bitwise_xor_expr(): Expression {
      let left = this.parse_bitwise_and_expr();
      while (this.at().type === TokenType.Caret) {
          const opToken = this.eat();
          const right = this.parse_bitwise_and_expr();
          left = { kind: "BinaryExpr", left, right, operator: "^", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_bitwise_and_expr(): Expression {
      let left = this.parse_equality_expr();
      while (this.at().type === TokenType.Ampersand) {
          const opToken = this.eat();
          const right = this.parse_equality_expr();
          left = { kind: "BinaryExpr", left, right, operator: "&", line: opToken.line, column: opToken.column } as BinaryExpr;
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
      let left = this.parse_shift_expr();
      while(this.at().type === TokenType.LessThan || this.at().type === TokenType.GreaterThan || this.at().type === TokenType.LessEquals || this.at().type === TokenType.GreaterEquals) {
          const opToken = this.eat();
          const right = this.parse_shift_expr();
          left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_shift_expr(): Expression {
      let left = this.parse_additive_expr();
      while (this.at().type === TokenType.ShiftLeft || this.at().type === TokenType.ShiftRight) {
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
    let left = this.parse_power_expr();
    while (this.at().type === TokenType.Times || this.at().type === TokenType.Slash || this.at().type === TokenType.Percent) {
      const opToken = this.eat();
      const right = this.parse_power_expr();
      left = { kind: "BinaryExpr", left, right, operator: opToken.value, line: opToken.line, column: opToken.column } as BinaryExpr;
    }
    return left;
  }

  private parse_power_expr(): Expression {
      let left = this.parse_unary_expr();
      while (this.at().type === TokenType.Power) {
          const opToken = this.eat();
          const right = this.parse_power_expr(); // Right-associative or just recursive
          left = { kind: "BinaryExpr", left, right, operator: "**", line: opToken.line, column: opToken.column } as BinaryExpr;
      }
      return left;
  }

  private parse_unary_expr(): Expression {
      if (this.at().type === TokenType.Minus || this.at().type === TokenType.Not || this.at().type === TokenType.NotLogic) {
          const opToken = this.eat();
          const arg = this.parse_unary_expr();
          return { kind: "BinaryExpr", left: arg, right: { kind: "NumericLiteral", value: 0 } as any, operator: "unary_" + (opToken.value || "not"), line: opToken.line, column: opToken.column } as any;
      }
      
      if (this.at().type === TokenType.Await) {
          const awaitToken = this.eat();
          const arg = this.parse_unary_expr();
          return { kind: "AwaitExpr", argument: arg, line: awaitToken.line, column: awaitToken.column } as AwaitExpr;
      }
      
      return this.parse_call_member_expr();
  }

  private parse_call_member_expr(): Expression {
      let object = this.parse_primary_expr();
      
      while (
          this.at().type === TokenType.OpenParen || 
          this.at().type === TokenType.Dot || 
          this.at().type === TokenType.OpenBracket || 
          this.at().type === TokenType.OptionalChain
      ) {
          if (this.at().type === TokenType.OpenParen) {
              object = this.parse_call_expr(object);
          } else {
              object = this.parse_member_expr_step(object);
          }
      }
      return object;
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

  private parse_member_expr_step(object: Expression): Expression {
      const operator = this.eat();
      let property: Expression;
      let computed: boolean;
      let optional = operator.type === TokenType.OptionalChain;

      if (operator.type === TokenType.Dot || operator.type === TokenType.OptionalChain) {
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

      return { kind: "MemberExpr", object, property, computed, optional, line: operator.line, column: operator.column } as MemberExpr;
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
        // Lookahead for single-param arrow function: x => x * 2
        if (this.peek(1).type === TokenType.Arrow) {
            const param = this.eat().value;
            this.eat(); // consume =>
            const body = this.at().type === TokenType.OpenBrace ? (this.parse_block() as any).body : this.parse_expression();
            return { kind: "ArrowFnExpr", parameters: [param], body, async: false, line: tk.line, column: tk.column } as ArrowFnExpr;
        }
        return { kind: "Identifier", symbol: this.eat().value, line: tk.line, column: tk.column } as Identifier;
      case TokenType.Number:
        return { kind: "NumericLiteral", value: parseFloat(this.eat().value), line: tk.line, column: tk.column } as NumericLiteral;
      case TokenType.String:
        return { kind: "StringLiteral", value: this.eat().value, line: tk.line, column: tk.column } as StringLiteral;
      case TokenType.Include:
          const includeToken = this.eat();
          this.expect(TokenType.OpenParen, "Expected ( after include keyword.");
          const moduleExpr = this.parse_expression();
          this.expect(TokenType.CloseParen, "Expected ) after module name in include().");
          return { kind: "ImportExpr", moduleName: moduleExpr, line: includeToken.line, column: includeToken.column } as ImportExpr;
      case TokenType.OpenParen: {
        // Lookahead for multi-param arrow function: (a, b) => ...
        let i = 1;
        while (this.peek(i).type !== TokenType.EOF && this.peek(i).type !== TokenType.CloseParen) {
            i++;
        }
        if (this.peek(i).type === TokenType.CloseParen && this.peek(i+1).type === TokenType.Arrow) {
            this.eat(); // (
            const params: string[] = [];
            while (this.at().type !== TokenType.CloseParen) {
                params.push(this.expect(TokenType.Identifier, "Expected identifier in arrow function parameters").value);
                if (this.at().type === TokenType.Comma) this.eat();
            }
            this.eat(); // )
            this.eat(); // =>
            const body = this.at().type === TokenType.OpenBrace ? (this.parse_block() as any).body : this.parse_expression();
            return { kind: "ArrowFnExpr", parameters: params, body, async: false, line: tk.line, column: tk.column } as ArrowFnExpr;
        }

        this.eat(); // (
        const value = this.parse_expression();
        this.expect(TokenType.CloseParen, "Expected closing parenthesis.");
        return value;
      }
      case TokenType.OpenBracket:
          return this.parse_array_expr();
      case TokenType.OpenBrace:
          return this.parse_object_expr();
      case TokenType.Async:
          if (this.peek(1).type === TokenType.Fn) {
              return this.parse_anonymous_function(true);
          }
          throw new NovaSyntaxError(`Unexpected token found: ${tk.value}`, this.getLocation(tk));
      case TokenType.Fn:
          return this.parse_anonymous_function(false);
      default:
        throw new NovaSyntaxError(`Unexpected token found: ${tk.value}`, this.getLocation(tk));
    }
  }
  
  private parse_export_declaration(): Statement {
      const exportToken = this.eat(); // 'export'
      const declaration = this.parse_statement();
      
      // Ensure it's a valid exportable statement (let, const, fn)
      if (declaration.kind !== "VarDeclaration" && declaration.kind !== "FunctionDeclaration") {
          throw new NovaSyntaxError(`Only variables and functions can be exported directly.`, this.getLocation(exportToken));
      }

      return { kind: "ExportDeclaration", declaration, line: exportToken.line, column: exportToken.column } as ExportDeclaration;
  }

  private parse_named_import(): Statement {
      const importToken = this.eat(); // 'include' or 'import'
      this.expect(TokenType.OpenBrace, "Expected { for named imports.");
      
      const imports: string[] = [];
      while (this.at().type !== TokenType.CloseBrace && this.not_eof()) {
          const id = this.expect(TokenType.Identifier, "Expected identifier in named import").value;
          imports.push(id);
          if (this.at().type === TokenType.Comma) {
              this.eat();
          }
      }
      this.expect(TokenType.CloseBrace, "Expected } after named imports.");
      this.expect(TokenType.From, "Expected 'from' after named imports.");
      const moduleStr = this.expect(TokenType.String, "Expected module string after 'from'.").value;
      
      return { kind: "NamedImportStatement", imports, moduleName: moduleStr, line: importToken.line, column: importToken.column } as NamedImportStatement;
  }

  private is_start_of_expression(type: TokenType): boolean {
      return type === TokenType.Identifier || type === TokenType.Number || type === TokenType.String || 
             type === TokenType.OpenParen || type === TokenType.OpenBrace || type === TokenType.OpenBracket || 
             type === TokenType.Minus || type === TokenType.Not || type === TokenType.NotLogic || 
             type === TokenType.Include || type === TokenType.Await || type === TokenType.Fn || type === TokenType.Async;
  }

  private parse_anonymous_function(isAsync: boolean): Expression {
      if (isAsync) this.eat(); // async
      const fnToken = this.eat(); // fn
      let name = "anonymous";
      if (this.at().type === TokenType.Identifier) {
          name = this.eat().value;
      }
      this.expect(TokenType.OpenParen, "Expected ( after function name");
      const args: string[] = [];
      while (this.at().type !== TokenType.CloseParen && this.not_eof()) {
          args.push(this.expect(TokenType.Identifier, "Expected identifier in parameters").value);
          if (this.at().type === TokenType.Comma) this.eat();
      }
      this.expect(TokenType.CloseParen, "Expected ) after function parameters");
      const bodyNode = this.parse_statement();
      const body = bodyNode.kind === "Program" ? (bodyNode as any).body : [bodyNode];
      return { kind: "FunctionDeclaration", name, parameters: args, body, async: isAsync, line: fnToken.line, column: fnToken.column } as any;
  }
}
