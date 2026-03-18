"use strict";
// src/frontend/parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lexer");
const errors_1 = require("../runtime/errors");
class Parser {
    constructor() {
        this.tokens = [];
        this.filename = "repl";
        this.source = "";
    }
    not_eof() {
        return this.tokens[0].type !== lexer_1.TokenType.EOF;
    }
    at() {
        return this.tokens[0];
    }
    eat() {
        return this.tokens.shift();
    }
    getLocation(token) {
        return {
            file: this.filename,
            line: token.line,
            column: token.column,
            source: this.source
        };
    }
    expect(type, err) {
        const prev = this.tokens.shift();
        if (!prev || prev.type !== type) {
            throw new errors_1.NovaSyntaxError(`${err}. Expected ${lexer_1.TokenType[type]} but found ${prev ? lexer_1.TokenType[prev.type] : "EOF"} ('${prev?.value}')`, this.getLocation(prev || { line: 0, column: 0, type: lexer_1.TokenType.EOF, value: "" }));
        }
        return prev;
    }
    produceAST(sourceCode, filename = "repl") {
        this.source = sourceCode;
        this.filename = filename;
        this.tokens = (0, lexer_1.tokenize)(sourceCode);
        const program = {
            kind: "Program",
            body: [],
        };
        while (this.not_eof()) {
            program.body.push(this.parse_statement());
        }
        return program;
    }
    parse_statement() {
        switch (this.at().type) {
            case lexer_1.TokenType.Let:
            case lexer_1.TokenType.Const:
                return this.parse_var_declaration();
            case lexer_1.TokenType.Function:
                return this.parse_function_declaration();
            case lexer_1.TokenType.If:
                return this.parse_if_statement();
            case lexer_1.TokenType.While:
            case lexer_1.TokenType.Repeat:
                return this.parse_loop_statement();
            case lexer_1.TokenType.Return:
                return this.parse_return_statement();
            case lexer_1.TokenType.Import:
                this.eat(); // eat import
                const moduleToken = this.expect(lexer_1.TokenType.String, "Expected string module name after import");
                return { kind: "ImportStatement", moduleName: moduleToken.value };
            case lexer_1.TokenType.Print:
                this.eat(); // eat print
                const args = [];
                while (this.is_start_of_expression(this.at().type)) {
                    if (this.at().type === lexer_1.TokenType.Identifier) {
                        const next = this.tokens[1]?.type;
                        if (next === lexer_1.TokenType.Becomes || next === lexer_1.TokenType.Be)
                            break;
                    }
                    args.push(this.parse_expression());
                    if (this.at().type === lexer_1.TokenType.Comma) {
                        this.eat();
                    }
                    else {
                        const nextType = this.at().type;
                        if (nextType === lexer_1.TokenType.End || nextType === lexer_1.TokenType.Otherwise || nextType === lexer_1.TokenType.EOF) {
                            break;
                        }
                        if (!this.is_start_of_expression(nextType))
                            break;
                    }
                }
                return {
                    kind: "CallExpr",
                    caller: { kind: "Identifier", symbol: "print" },
                    args,
                };
            default:
                return this.parse_expression();
        }
    }
    parse_return_statement() {
        this.eat(); // eat return
        if (this.at().type === lexer_1.TokenType.End || this.at().type === lexer_1.TokenType.EOF || this.at().type === lexer_1.TokenType.Otherwise) {
            return { kind: "ReturnStatement", value: undefined };
        }
        const value = this.parse_expression();
        return { kind: "ReturnStatement", value };
    }
    parse_loop_statement() {
        if (this.at().type === lexer_1.TokenType.Repeat) {
            this.eat(); // eat repeat
            const identifier = this.expect(lexer_1.TokenType.Identifier, "Expected identifier after repeat").value;
            this.expect(lexer_1.TokenType.From, "Expected 'from' after identifier in repeat loop");
            const start = this.parse_expression();
            this.expect(lexer_1.TokenType.To, "Expected 'to' after start value in repeat loop");
            const end = this.parse_expression();
            const body = [];
            while (this.at().type !== lexer_1.TokenType.End && this.not_eof()) {
                body.push(this.parse_statement());
            }
            this.expect(lexer_1.TokenType.End, "Expected 'end' after repeat loop body");
            return {
                kind: "ForStatement",
                counter: identifier,
                start,
                end,
                body,
            };
        }
        this.eat(); // eat while
        const condition = this.parse_expression();
        if (this.at().type === lexer_1.TokenType.Loop)
            this.eat();
        const body = [];
        while (this.at().type !== lexer_1.TokenType.End && this.not_eof()) {
            body.push(this.parse_statement());
        }
        this.expect(lexer_1.TokenType.End, "Expected 'end' after while loop");
        return {
            kind: "WhileStatement",
            condition,
            body,
        };
    }
    parse_if_statement() {
        this.eat(); // eat if
        const condition = this.parse_expression();
        if (this.at().type === lexer_1.TokenType.Then)
            this.eat();
        const thenBranch = [];
        while (this.at().type !== lexer_1.TokenType.Otherwise && this.at().type !== lexer_1.TokenType.End && this.not_eof()) {
            thenBranch.push(this.parse_statement());
        }
        let elseBranch = [];
        if (this.at().type === lexer_1.TokenType.Otherwise) {
            this.eat();
            while (this.at().type !== lexer_1.TokenType.End && this.not_eof()) {
                elseBranch.push(this.parse_statement());
            }
        }
        this.expect(lexer_1.TokenType.End, "Expected 'end' after if statement");
        return {
            kind: "IfStatement",
            condition,
            thenBranch,
            elseBranch: elseBranch.length > 0 ? elseBranch : undefined
        };
    }
    parse_function_declaration() {
        this.eat(); // eat function
        const name = this.expect(lexer_1.TokenType.Identifier, "Expected function name").value;
        const args = [];
        while (this.at().type === lexer_1.TokenType.Identifier) {
            args.push(this.eat().value);
        }
        const body = [];
        if (this.at().type === lexer_1.TokenType.Return) {
            body.push(this.parse_return_statement());
            if (this.at().type === lexer_1.TokenType.End) {
                this.eat();
            }
        }
        else {
            while (this.at().type !== lexer_1.TokenType.End && this.not_eof()) {
                body.push(this.parse_statement());
            }
            this.expect(lexer_1.TokenType.End, "Expected 'end' after function body");
        }
        return {
            kind: "FunctionDeclaration",
            name,
            parameters: args,
            body,
        };
    }
    parse_var_declaration() {
        const isConstant = this.eat().type === lexer_1.TokenType.Const;
        const identifier = this.expect(lexer_1.TokenType.Identifier, "Expected identifier name following let/const keywords.").value;
        if (this.at().type === lexer_1.TokenType.Be) {
            this.eat(); // eat 'be'
            const value = this.parse_expression();
            return {
                kind: "VarDeclaration",
                constant: isConstant,
                identifier,
                value,
            };
        }
        if (isConstant) {
            throw new errors_1.NovaSyntaxError("Must assign value to constant expression. No value provided.", this.getLocation(this.at()));
        }
        return {
            kind: "VarDeclaration",
            constant: isConstant,
            identifier,
            value: undefined,
        };
    }
    parse_expression() {
        return this.parse_assignment_expr();
    }
    parse_assignment_expr() {
        const left = this.parse_object_expr();
        if (this.at().type === lexer_1.TokenType.Becomes) {
            this.eat(); // eat 'becomes'
            const value = this.parse_assignment_expr();
            return {
                kind: "AssignmentExpr",
                assignee: left,
                value,
            };
        }
        return left;
    }
    parse_object_expr() {
        if (this.at().type === lexer_1.TokenType.Identifier) {
            const nextToken = this.tokens[1];
            if (this.is_start_of_expression(nextToken.type)) {
                if (nextToken.type === lexer_1.TokenType.String || nextToken.type === lexer_1.TokenType.Number) {
                    const afterValue = this.tokens[2];
                    const isObject = !afterValue ||
                        afterValue.type === lexer_1.TokenType.Comma ||
                        afterValue.type === lexer_1.TokenType.End ||
                        afterValue.type === lexer_1.TokenType.Otherwise ||
                        afterValue.type === lexer_1.TokenType.EOF;
                    if (isObject) {
                        const properties = [];
                        while (this.at().type !== lexer_1.TokenType.EOF && this.at().type !== lexer_1.TokenType.End && this.at().type !== lexer_1.TokenType.Otherwise) {
                            const key = this.expect(lexer_1.TokenType.Identifier, "Expected key in object literal").value;
                            const value = this.parse_logical_or_expr();
                            properties.push({ kind: "Property", key, value });
                            if (this.at().type !== lexer_1.TokenType.Comma) {
                                break;
                            }
                            this.eat();
                        }
                        if (this.at().type === lexer_1.TokenType.End) {
                            this.eat();
                        }
                        return { kind: "ObjectLiteral", properties };
                    }
                }
            }
        }
        const left = this.parse_logical_or_expr();
        if (this.at().type === lexer_1.TokenType.Comma) {
            const elements = [left];
            while (this.at().type === lexer_1.TokenType.Comma) {
                this.eat();
                elements.push(this.parse_logical_or_expr());
            }
            return { kind: "ArrayLiteral", elements };
        }
        return left;
    }
    parse_logical_or_expr() {
        let left = this.parse_logical_and_expr();
        while (this.at().type === lexer_1.TokenType.Or) {
            const operator = this.eat().value;
            const right = this.parse_logical_and_expr();
            left = { kind: "BinaryExpr", left, right, operator };
        }
        return left;
    }
    parse_logical_and_expr() {
        let left = this.parse_equality_expr();
        while (this.at().type === lexer_1.TokenType.And) {
            const operator = this.eat().value;
            const right = this.parse_equality_expr();
            left = { kind: "BinaryExpr", left, right, operator };
        }
        return left;
    }
    parse_equality_expr() {
        let left = this.parse_relational_expr();
        while (this.at().type === lexer_1.TokenType.Equals || this.at().type === lexer_1.TokenType.NotEquals) {
            const operator = this.eat().value;
            const right = this.parse_relational_expr();
            left = { kind: "BinaryExpr", left, right, operator };
        }
        return left;
    }
    parse_relational_expr() {
        let left = this.parse_additive_expr();
        while (this.at().type === lexer_1.TokenType.LessThan || this.at().type === lexer_1.TokenType.GreaterThan) {
            const operator = this.eat().value;
            const right = this.parse_additive_expr();
            left = { kind: "BinaryExpr", left, right, operator };
        }
        return left;
    }
    parse_additive_expr() {
        let left = this.parse_multiplicative_expr();
        while (this.at().value === "plus" || this.at().value === "minus" || this.at().type === lexer_1.TokenType.Plus || this.at().type === lexer_1.TokenType.Minus) {
            const operator = this.eat().value;
            const right = this.parse_multiplicative_expr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            };
        }
        return left;
    }
    parse_multiplicative_expr() {
        let left = this.parse_call_member_expr();
        while (this.at().value === "times" ||
            this.at().value === "divided by" ||
            this.at().value === "modulo" ||
            this.at().type === lexer_1.TokenType.Times ||
            this.at().type === lexer_1.TokenType.DividedBy ||
            this.at().type === lexer_1.TokenType.Modulo) {
            const operator = this.eat().value;
            const right = this.parse_call_member_expr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            };
        }
        return left;
    }
    parse_call_member_expr() {
        const member = this.parse_member_expr();
        if (this.at().type === lexer_1.TokenType.OpenParen) {
            return this.parse_call_expr(member);
        }
        return member;
    }
    parse_call_expr(caller) {
        return {
            kind: "CallExpr",
            caller,
            args: [], // Handle parenthesized args if needed
        };
    }
    parse_member_expr() {
        let object = this.parse_primary_expr();
        while (this.at().type === lexer_1.TokenType.Dot) {
            this.eat(); // eat .
            const property = this.parse_primary_expr();
            if (property.kind !== "Identifier") {
                throw new errors_1.NovaSyntaxError("Cannot use dot operator without right hand side being an identifier.", this.getLocation(this.at()));
            }
            object = {
                kind: "MemberExpr",
                object,
                property,
                computed: false
            };
        }
        return object;
    }
    parse_primary_expr() {
        const tk = this.at();
        switch (tk.type) {
            case lexer_1.TokenType.Identifier:
                return { kind: "Identifier", symbol: this.eat().value };
            case lexer_1.TokenType.Number:
                return { kind: "NumericLiteral", value: parseFloat(this.eat().value) };
            case lexer_1.TokenType.String:
                return { kind: "StringLiteral", value: this.eat().value };
            case lexer_1.TokenType.OpenParen: {
                this.eat();
                const value = this.parse_expression();
                this.expect(lexer_1.TokenType.CloseParen, "Expected closing parenthesis");
                return value;
            }
            case lexer_1.TokenType.Call: {
                this.eat();
                let caller;
                const next = this.at().type;
                if (next === lexer_1.TokenType.Input || next === lexer_1.TokenType.Print) {
                    caller = { kind: "Identifier", symbol: this.eat().value.toLowerCase() };
                }
                else {
                    caller = this.parse_primary_expr();
                }
                const args = [];
                while (this.is_start_of_expression(this.at().type)) {
                    if (this.at().type === lexer_1.TokenType.Identifier) {
                        const nextToken = this.tokens[1]?.type;
                        if (nextToken === lexer_1.TokenType.Becomes || nextToken === lexer_1.TokenType.Be)
                            break;
                    }
                    args.push(this.parse_expression());
                    if (this.at().type === lexer_1.TokenType.Comma)
                        this.eat();
                }
                return { kind: "CallExpr", caller, args };
            }
            case lexer_1.TokenType.Input: {
                this.eat();
                const args = [];
                if (this.at().type === lexer_1.TokenType.String) {
                    args.push(this.parse_primary_expr());
                }
                return { kind: "CallExpr", caller: { kind: "Identifier", symbol: "input" }, args };
            }
            default:
                if (this.at().type === lexer_1.TokenType.EOF) {
                    throw new errors_1.NovaSyntaxError("Unexpected end of file. Expected an expression.", this.getLocation(tk));
                }
                throw new errors_1.NovaSyntaxError(`Unexpected token found during parsing! Found: ${lexer_1.TokenType[tk.type]} ('${tk.value}')`, this.getLocation(tk));
        }
    }
    is_start_of_expression(type) {
        return [
            lexer_1.TokenType.Identifier, lexer_1.TokenType.Number, lexer_1.TokenType.String,
            lexer_1.TokenType.OpenParen, lexer_1.TokenType.Call, lexer_1.TokenType.Input
        ].includes(type);
    }
}
exports.default = Parser;
