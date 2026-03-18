
// src/frontend/parser.ts

import { 
    Statement, Program, Expression, BinaryExpr, NumericLiteral, Identifier, 
    VarDeclaration, AssignmentExpr, CallExpr, FunctionDeclaration, IfStatement, 
    WhileStatement, MemberExpr, ObjectLiteral, Property, StringLiteral, 
    ReturnStatement, ArrayLiteral, ForStatement, ImportStatement 
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
    };

    while (this.not_eof()) {
      program.body.push(this.parse_statement());
    }

    return program;
  }

  private parse_statement(): Statement {
    switch (this.at().type) {
      case TokenType.Let:
      case TokenType.Const:
        return this.parse_var_declaration();
      case TokenType.Function:
        return this.parse_function_declaration();
      case TokenType.If:
        return this.parse_if_statement();
      case TokenType.While:
      case TokenType.Repeat:
        return this.parse_loop_statement();
      case TokenType.Return:
        return this.parse_return_statement();
      case TokenType.Import:
        this.eat(); // eat import
        const moduleToken = this.expect(TokenType.String, "Expected string module name after import");
        return { kind: "ImportStatement", moduleName: moduleToken.value } as ImportStatement;
      case TokenType.Print:
          this.eat(); // eat print
          const args = [];
          while (this.is_start_of_expression(this.at().type)) {
              if (this.at().type === TokenType.Identifier) {
                  const next = this.tokens[1]?.type;
                  if (next === TokenType.Becomes || next === TokenType.Be) break;
              }
              
              args.push(this.parse_expression());
              
              if (this.at().type === TokenType.Comma) {
                  this.eat();
              } else {
                  const nextType = this.at().type;
                  if (nextType === TokenType.End || nextType === TokenType.Otherwise || nextType === TokenType.EOF) {
                      break;
                  }
                  if (!this.is_start_of_expression(nextType)) break;
              }
          }
          return {
              kind: "CallExpr",
              caller: { kind: "Identifier", symbol: "print" } as Identifier,
              args,
          } as CallExpr;
      default:
        return this.parse_expression();
    }
  }

  private parse_return_statement(): Statement {
      this.eat(); // eat return
      if (this.at().type === TokenType.End || this.at().type === TokenType.EOF || this.at().type === TokenType.Otherwise) {
          return { kind: "ReturnStatement", value: undefined } as ReturnStatement;
      }
      const value = this.parse_expression();
      return { kind: "ReturnStatement", value } as ReturnStatement;
  }

  private parse_loop_statement(): Statement {
      if (this.at().type === TokenType.Repeat) {
          this.eat(); // eat repeat
          const identifier = this.expect(TokenType.Identifier, "Expected identifier after repeat").value;
          this.expect(TokenType.From, "Expected 'from' after identifier in repeat loop");
          const start = this.parse_expression();
          this.expect(TokenType.To, "Expected 'to' after start value in repeat loop");
          const end = this.parse_expression();
          
          const body: Statement[] = [];
          while (this.at().type !== TokenType.End && this.not_eof()) {
              body.push(this.parse_statement());
          }
          this.expect(TokenType.End, "Expected 'end' after repeat loop body");
          
          return {
              kind: "ForStatement",
              counter: identifier,
              start,
              end,
              body,
          } as ForStatement;
      }
      
      this.eat(); // eat while
      const condition = this.parse_expression();
      if (this.at().type === TokenType.Loop) this.eat();

      const body: Statement[] = [];
      while (this.at().type !== TokenType.End && this.not_eof()) {
          body.push(this.parse_statement());
      }
      this.expect(TokenType.End, "Expected 'end' after while loop");

      return {
          kind: "WhileStatement",
          condition,
          body,
      } as WhileStatement;
  }

  private parse_if_statement(): Statement {
      this.eat(); // eat if
      const condition = this.parse_expression();
      if (this.at().type === TokenType.Then) this.eat();

      const thenBranch: Statement[] = [];
      while (this.at().type !== TokenType.Otherwise && this.at().type !== TokenType.End && this.not_eof()) {
          thenBranch.push(this.parse_statement());
      }

      let elseBranch: Statement[] = [];
      if (this.at().type === TokenType.Otherwise) {
          this.eat();
          while (this.at().type !== TokenType.End && this.not_eof()) {
              elseBranch.push(this.parse_statement());
          }
      }

      this.expect(TokenType.End, "Expected 'end' after if statement");

      return {
          kind: "IfStatement",
          condition,
          thenBranch,
          elseBranch: elseBranch.length > 0 ? elseBranch : undefined
      } as IfStatement;
  }

  private parse_function_declaration(): Statement {
      this.eat(); // eat function
      const name = this.expect(TokenType.Identifier, "Expected function name").value;
      
      const args: string[] = [];
      while (this.at().type === TokenType.Identifier) {
          args.push(this.eat().value);
      }

      const body: Statement[] = [];
      if (this.at().type === TokenType.Return) {
          body.push(this.parse_return_statement());
          if (this.at().type === TokenType.End) {
              this.eat();
          }
      } else {
          while (this.at().type !== TokenType.End && this.not_eof()) {
              body.push(this.parse_statement());
          }
          this.expect(TokenType.End, "Expected 'end' after function body");
      }

      return {
          kind: "FunctionDeclaration",
          name,
          parameters: args,
          body,
      } as FunctionDeclaration;
  }

  private parse_var_declaration(): Statement {
    const isConstant = this.eat().type === TokenType.Const;
    const identifier = this.expect(
      TokenType.Identifier,
      "Expected identifier name following let/const keywords."
    ).value;

    if (this.at().type === TokenType.Be) {
      this.eat(); // eat 'be'
      const value = this.parse_expression();
      return {
        kind: "VarDeclaration",
        constant: isConstant,
        identifier,
        value,
      } as VarDeclaration;
    } 
    
    if (isConstant) {
      throw new NovaSyntaxError("Must assign value to constant expression. No value provided.", this.getLocation(this.at()));
    }

    return {
      kind: "VarDeclaration",
      constant: isConstant,
      identifier,
      value: undefined,
    } as VarDeclaration;
  }

  private parse_expression(): Expression {
    return this.parse_assignment_expr();
  }

  private parse_assignment_expr(): Expression {
    const left = this.parse_object_expr();

    if (this.at().type === TokenType.Becomes) {
      this.eat(); // eat 'becomes'
      const value = this.parse_assignment_expr();
      return {
        kind: "AssignmentExpr",
        assignee: left,
        value,
      } as AssignmentExpr;
    }

    return left;
  }

  private parse_object_expr(): Expression {
      if (this.at().type === TokenType.Identifier) {
          const nextToken = this.tokens[1];
          if (this.is_start_of_expression(nextToken.type)) {
               if (nextToken.type === TokenType.String || nextToken.type === TokenType.Number) {
                   const afterValue = this.tokens[2];
                   const isObject = !afterValue || 
                                    afterValue.type === TokenType.Comma || 
                                    afterValue.type === TokenType.End || 
                                    afterValue.type === TokenType.Otherwise || 
                                    afterValue.type === TokenType.EOF;

                   if (isObject) {
                       const properties: Property[] = [];
                       while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.End && this.at().type !== TokenType.Otherwise) {
                           const key = this.expect(TokenType.Identifier, "Expected key in object literal").value;
                           const value = this.parse_logical_or_expr();
                           properties.push({ kind: "Property", key, value } as Property);
                           
                           if (this.at().type !== TokenType.Comma) {
                               break;
                           }
                           this.eat();
                       }
                       if (this.at().type === TokenType.End) {
                           this.eat();
                       }
                       return { kind: "ObjectLiteral", properties } as ObjectLiteral;
                   }
               }
          }
      }

      const left = this.parse_logical_or_expr();
      
      if (this.at().type === TokenType.Comma) {
          const elements = [left];
          while (this.at().type === TokenType.Comma) {
              this.eat();
              elements.push(this.parse_logical_or_expr());
          }
          return { kind: "ArrayLiteral", elements } as ArrayLiteral;
      }

      return left;
  }

  private parse_logical_or_expr(): Expression {
      let left = this.parse_logical_and_expr();
      while(this.at().type === TokenType.Or) {
          const operator = this.eat().value;
          const right = this.parse_logical_and_expr();
          left = { kind: "BinaryExpr", left, right, operator } as BinaryExpr;
      }
      return left;
  }

  private parse_logical_and_expr(): Expression {
      let left = this.parse_equality_expr();
      while(this.at().type === TokenType.And) {
          const operator = this.eat().value;
          const right = this.parse_equality_expr();
          left = { kind: "BinaryExpr", left, right, operator } as BinaryExpr;
      }
      return left;
  }

  private parse_equality_expr(): Expression {
      let left = this.parse_relational_expr();
      while(this.at().type === TokenType.Equals || this.at().type === TokenType.NotEquals) {
          const operator = this.eat().value;
          const right = this.parse_relational_expr();
          left = { kind: "BinaryExpr", left, right, operator } as BinaryExpr;
      }
      return left;
  }

  private parse_relational_expr(): Expression {
      let left = this.parse_additive_expr();
      while(this.at().type === TokenType.LessThan || this.at().type === TokenType.GreaterThan) {
          const operator = this.eat().value;
          const right = this.parse_additive_expr();
          left = { kind: "BinaryExpr", left, right, operator } as BinaryExpr;
      }
      return left;
  }

  private parse_additive_expr(): Expression {
    let left = this.parse_multiplicative_expr();
    while (this.at().value === "plus" || this.at().value === "minus" || this.at().type === TokenType.Plus || this.at().type === TokenType.Minus) {
      const operator = this.eat().value;
      const right = this.parse_multiplicative_expr();
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      } as BinaryExpr;
    }
    return left;
  }

  private parse_multiplicative_expr(): Expression {
    let left = this.parse_call_member_expr();
    while (
      this.at().value === "times" || 
      this.at().value === "divided by" || 
      this.at().value === "modulo" ||
      this.at().type === TokenType.Times ||
      this.at().type === TokenType.DividedBy || 
      this.at().type === TokenType.Modulo
    ) {
      const operator = this.eat().value;
      const right = this.parse_call_member_expr();
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      } as BinaryExpr;
    }
    return left;
  }

  private parse_call_member_expr(): Expression {
      const member = this.parse_member_expr();

      if (this.at().type === TokenType.OpenParen) {
          return this.parse_call_expr(member);
      }

      return member;
  }

  private parse_call_expr(caller: Expression): Expression {
    return {
      kind: "CallExpr",
      caller,
      args: [], // Handle parenthesized args if needed
    } as CallExpr;
  }

  private parse_member_expr(): Expression {
      let object = this.parse_primary_expr();

      while (this.at().type === TokenType.Dot) {
          this.eat(); // eat .
          const property = this.parse_primary_expr();
           if (property.kind !== "Identifier") {
              throw new NovaSyntaxError("Cannot use dot operator without right hand side being an identifier.", this.getLocation(this.at()));
          }
          object = {
              kind: "MemberExpr",
              object,
              property,
              computed: false
          } as MemberExpr;
      }

      return object;
  }

  private parse_primary_expr(): Expression {
    const tk = this.at();

    switch (tk.type) {
      case TokenType.Identifier:
        return { kind: "Identifier", symbol: this.eat().value } as Identifier;

      case TokenType.Number:
        return { kind: "NumericLiteral", value: parseFloat(this.eat().value) } as NumericLiteral;

      case TokenType.String:
        return { kind: "StringLiteral", value: this.eat().value } as StringLiteral;

      case TokenType.OpenParen: {
        this.eat();
        const value = this.parse_expression();
        this.expect(TokenType.CloseParen, "Expected closing parenthesis");
        return value;
      }
      
      case TokenType.Call: {
          this.eat();
          let caller: Expression;
          const next = this.at().type;
          
          if (next === TokenType.Input || next === TokenType.Print) {
              caller = { kind: "Identifier", symbol: this.eat().value.toLowerCase() } as Identifier;
          } else {
              caller = this.parse_primary_expr();
          }

          const args: Expression[] = [];
          while (this.is_start_of_expression(this.at().type)) {
              if (this.at().type === TokenType.Identifier) {
                  const nextToken = this.tokens[1]?.type;
                  if (nextToken === TokenType.Becomes || nextToken === TokenType.Be) break;
              }
              args.push(this.parse_expression());
              if (this.at().type === TokenType.Comma) this.eat();
          }
          return { kind: "CallExpr", caller, args } as CallExpr;
      }
      
      case TokenType.Input: {
          this.eat();
          const args: Expression[] = [];
          if (this.at().type === TokenType.String) {
              args.push(this.parse_primary_expr());
          }
          return { kind: "CallExpr", caller: { kind: "Identifier", symbol: "input" } as Identifier, args } as CallExpr;
      }

      default:
        if (this.at().type === TokenType.EOF) {
            throw new NovaSyntaxError("Unexpected end of file. Expected an expression.", this.getLocation(tk));
        }
        throw new NovaSyntaxError(`Unexpected token found during parsing! Found: ${TokenType[tk.type]} ('${tk.value}')`, this.getLocation(tk));
    }
  }
  
  private is_start_of_expression(type: TokenType): boolean {
      return [
          TokenType.Identifier, TokenType.Number, TokenType.String, 
          TokenType.OpenParen, TokenType.Call, TokenType.Input
      ].includes(type);
  }
}
