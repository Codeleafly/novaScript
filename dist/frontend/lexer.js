"use strict";
// src/frontend/lexer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenType = void 0;
exports.tokenize = tokenize;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType[TokenType["Number"] = 0] = "Number";
    TokenType[TokenType["String"] = 1] = "String";
    TokenType[TokenType["Identifier"] = 2] = "Identifier";
    // Keywords
    TokenType[TokenType["Let"] = 3] = "Let";
    TokenType[TokenType["Const"] = 4] = "Const";
    TokenType[TokenType["Be"] = 5] = "Be";
    TokenType[TokenType["Becomes"] = 6] = "Becomes";
    // Comparison
    TokenType[TokenType["Equals"] = 7] = "Equals";
    TokenType[TokenType["NotEquals"] = 8] = "NotEquals";
    TokenType[TokenType["LessThan"] = 9] = "LessThan";
    TokenType[TokenType["GreaterThan"] = 10] = "GreaterThan";
    // Logical
    TokenType[TokenType["And"] = 11] = "And";
    TokenType[TokenType["Or"] = 12] = "Or";
    TokenType[TokenType["Not"] = 13] = "Not";
    // Arithmetic
    TokenType[TokenType["Plus"] = 14] = "Plus";
    TokenType[TokenType["Minus"] = 15] = "Minus";
    TokenType[TokenType["Times"] = 16] = "Times";
    TokenType[TokenType["DividedBy"] = 17] = "DividedBy";
    TokenType[TokenType["Modulo"] = 18] = "Modulo";
    // Control Flow
    TokenType[TokenType["If"] = 19] = "If";
    TokenType[TokenType["Then"] = 20] = "Then";
    TokenType[TokenType["Otherwise"] = 21] = "Otherwise";
    TokenType[TokenType["End"] = 22] = "End";
    TokenType[TokenType["While"] = 23] = "While";
    TokenType[TokenType["Loop"] = 24] = "Loop";
    TokenType[TokenType["Repeat"] = 25] = "Repeat";
    TokenType[TokenType["For"] = 26] = "For";
    TokenType[TokenType["To"] = 27] = "To";
    TokenType[TokenType["From"] = 28] = "From";
    // Functions
    TokenType[TokenType["Function"] = 29] = "Function";
    TokenType[TokenType["Return"] = 30] = "Return";
    TokenType[TokenType["Call"] = 31] = "Call";
    // Grouping & Punctuation
    TokenType[TokenType["OpenParen"] = 32] = "OpenParen";
    TokenType[TokenType["CloseParen"] = 33] = "CloseParen";
    TokenType[TokenType["Comma"] = 34] = "Comma";
    TokenType[TokenType["Dot"] = 35] = "Dot";
    // IO / Native
    TokenType[TokenType["Print"] = 36] = "Print";
    TokenType[TokenType["Input"] = 37] = "Input";
    TokenType[TokenType["Import"] = 38] = "Import";
    // Special
    TokenType[TokenType["EOF"] = 39] = "EOF";
})(TokenType || (exports.TokenType = TokenType = {}));
const KEYWORDS = {
    "let": TokenType.Let,
    "const": TokenType.Const,
    "be": TokenType.Be,
    "becomes": TokenType.Becomes,
    "if": TokenType.If,
    "then": TokenType.Then,
    "otherwise": TokenType.Otherwise,
    "end": TokenType.End,
    "while": TokenType.While,
    "loop": TokenType.Loop,
    "repeat": TokenType.Repeat,
    "for": TokenType.For,
    "to": TokenType.To,
    "from": TokenType.From,
    "function": TokenType.Function,
    "return": TokenType.Return,
    "call": TokenType.Call,
    "plus": TokenType.Plus,
    "minus": TokenType.Minus,
    "times": TokenType.Times,
    "divided": TokenType.DividedBy,
    "modulo": TokenType.Modulo,
    "and": TokenType.And,
    "or": TokenType.Or,
    "not": TokenType.Not,
    "greater": TokenType.GreaterThan,
    "less": TokenType.LessThan,
    "equals": TokenType.Equals,
    "print": TokenType.Print,
    "input": TokenType.Input,
    "import": TokenType.Import,
};
function tokenize(sourceCode) {
    const tokens = [];
    const src = sourceCode.split("");
    let line = 1;
    let column = 1;
    const pushToken = (value, type) => {
        tokens.push({ value, type, line, column: column - value.length });
    };
    while (src.length > 0) {
        // 1. Handle Skip tokens
        if (src[0] === "(") {
            src.shift();
            column++;
            pushToken("(", TokenType.OpenParen);
        }
        else if (src[0] === ")") {
            src.shift();
            column++;
            pushToken(")", TokenType.CloseParen);
        }
        else if (src[0] === ",") {
            src.shift();
            column++;
            pushToken(",", TokenType.Comma);
        }
        else if (src[0] === ".") {
            src.shift();
            column++;
            pushToken(".", TokenType.Dot);
        }
        // Handle binary operators like +, -, *, / if user uses symbols
        else if (src[0] === "+") {
            src.shift();
            column++;
            pushToken("+", TokenType.Plus);
        }
        else if (src[0] === "-") {
            src.shift();
            column++;
            pushToken("-", TokenType.Minus);
        }
        else if (src[0] === "*") {
            src.shift();
            column++;
            pushToken("*", TokenType.Times);
        }
        else if (src[0] === "/") {
            src.shift();
            column++;
            pushToken("/", TokenType.DividedBy);
        }
        else if (src[0] === "=") {
            if (src[1] === "=") {
                src.shift();
                src.shift();
                column += 2;
                pushToken("==", TokenType.Equals);
            }
            else {
                src.shift();
                column++;
                pushToken("=", TokenType.Be);
            }
        }
        // 2. Handle Multicharacter Tokens
        // Comments
        else if (src[0] === "#") {
            while (src.length > 0 && src[0] !== "\n") {
                src.shift();
            }
        }
        // Newlines
        else if (src[0] === "\n") {
            line++;
            column = 1;
            src.shift();
        }
        // Whitespace
        else if (/\s/.test(src[0])) {
            src.shift();
            column++;
        }
        // Numbers
        else if (/[0-9]/.test(src[0])) {
            let num = "";
            while (src.length > 0 && /[0-9.]/.test(src[0])) {
                num += src.shift();
                column++;
            }
            pushToken(num, TokenType.Number);
        }
        // Strings
        else if (src[0] === '"') {
            src.shift();
            column++; // Skip opening quote
            let str = "";
            while (src.length > 0 && src[0] !== '"') {
                str += src.shift();
                column++;
            }
            src.shift();
            column++; // Skip closing quote
            pushToken(str, TokenType.String);
        }
        // Identifiers & Keywords
        else if (/[a-zA-Z_]/.test(src[0])) {
            let ident = "";
            while (src.length > 0 && /[a-zA-Z0-9_]/.test(src[0])) {
                ident += src.shift();
                column++;
            }
            // Check for multi-word keywords
            const lowerIdent = ident.toLowerCase();
            if (lowerIdent === "divided" && src[0] === " " && src[1] === "b" && src[2] === "y") {
                // divided by
                src.splice(0, 3);
                column += 3;
                pushToken("divided by", TokenType.DividedBy);
            }
            else if (lowerIdent === "greater" && src.slice(0, 5).join("") === " than") {
                // greater than
                src.splice(0, 5);
                column += 5;
                pushToken("greater than", TokenType.GreaterThan);
            }
            else if (lowerIdent === "less" && src.slice(0, 5).join("") === " than") {
                // less than
                src.splice(0, 5);
                column += 5;
                pushToken("less than", TokenType.LessThan);
            }
            else if (lowerIdent === "is" && src.slice(0, 8).join("") === " equal to") {
                // is equal to (optional)
                src.splice(0, 8);
                column += 8;
                pushToken("is equal to", TokenType.Equals);
            }
            else {
                const reserved = KEYWORDS[lowerIdent];
                if (reserved !== undefined) {
                    pushToken(ident, reserved);
                }
                else {
                    pushToken(ident, TokenType.Identifier);
                }
            }
        }
        else {
            console.error(`Unrecognized character found in source: ${src[0]} at line ${line}`);
            src.shift();
            column++;
        }
    }
    tokens.push({ type: TokenType.EOF, value: "EndOfFile", line, column });
    return tokens;
}
