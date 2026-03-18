
// src/frontend/lexer.ts

export enum TokenType {
  // Literals
  Number,
  String,
  Identifier,
  
  // Keywords
  Let,
  Const,
  Global,
  Fn,
  If,
  Else,
  While,
  For,
  From,
  To,
  Return,
  Include,
  And,
  Or,
  Not,
  Is,
  Isnt,
  
  // Symbols
  Assign,      // =
  Equals,      // ==
  NotEquals,   // !=
  LessThan,    // <
  GreaterThan, // >
  Plus,        // +
  Minus,       // -
  Times,       // *
  Slash,       // /
  Percent,     // %
  
  OpenParen,   // (
  CloseParen,  // )
  OpenBrace,   // {
  CloseBrace,  // }
  OpenBracket, // [
  CloseBracket,// ]
  Comma,
  Dot,
  
  // Special
  EOF,
}

const KEYWORDS: Record<string, TokenType> = {
  "let": TokenType.Let,
  "const": TokenType.Const,
  "global": TokenType.Global,
  "fn": TokenType.Fn,
  "if": TokenType.If,
  "else": TokenType.Else,
  "while": TokenType.While,
  "for": TokenType.For,
  "from": TokenType.From,
  "to": TokenType.To,
  "return": TokenType.Return,
  "include": TokenType.Include,
  "and": TokenType.And,
  "or": TokenType.Or,
  "not": TokenType.Not,
  "is": TokenType.Is,
  "isnt": TokenType.Isnt,
};

export interface Token {
  value: string;
  type: TokenType;
  line: number;
  column: number;
}

export function tokenize(sourceCode: string): Token[] {
  const tokens: Token[] = [];
  const src = sourceCode.split("");
  let line = 1;
  let column = 1;

  const pushToken = (value: string, type: TokenType) => {
      tokens.push({ value, type, line, column: column - value.length });
  };

  while (src.length > 0) {
    // 1. Handle Single-character Symbols
    if (src[0] === "(") {
      pushToken(src.shift()!, TokenType.OpenParen);
    } else if (src[0] === ")") {
      pushToken(src.shift()!, TokenType.CloseParen);
    } else if (src[0] === "{") {
      pushToken(src.shift()!, TokenType.OpenBrace);
    } else if (src[0] === "}") {
      pushToken(src.shift()!, TokenType.CloseBrace);
    } else if (src[0] === "[") {
      pushToken(src.shift()!, TokenType.OpenBracket);
    } else if (src[0] === "]") {
      pushToken(src.shift()!, TokenType.CloseBracket);
    } else if (src[0] === ",") {
      pushToken(src.shift()!, TokenType.Comma);
    } else if (src[0] === ".") {
      pushToken(src.shift()!, TokenType.Dot);
    } else if (src[0] === "+") {
      pushToken(src.shift()!, TokenType.Plus);
    } else if (src[0] === "-") {
      pushToken(src.shift()!, TokenType.Minus);
    } else if (src[0] === "*") {
      pushToken(src.shift()!, TokenType.Times);
    } else if (src[0] === "/") {
      pushToken(src.shift()!, TokenType.Slash);
    } else if (src[0] === "%") {
      pushToken(src.shift()!, TokenType.Percent);
    } else if (src[0] === "=") {
        if (src[1] === "=") {
             src.shift(); src.shift(); column += 2;
             tokens.push({ value: "==", type: TokenType.Equals, line, column: column - 2 });
             continue;
        } else {
             pushToken(src.shift()!, TokenType.Assign);
        }
    } else if (src[0] === "!") {
        if (src[1] === "=") {
             src.shift(); src.shift(); column += 2;
             tokens.push({ value: "!=", type: TokenType.NotEquals, line, column: column - 2 });
             continue;
        } else {
            console.error(`Unrecognized character found in source: ! at line ${line}`);
            src.shift(); column++;
        }
    } else if (src[0] === "<") {
        pushToken(src.shift()!, TokenType.LessThan);
    } else if (src[0] === ">") {
        pushToken(src.shift()!, TokenType.GreaterThan);
    }

    // 2. Handle Comments, Whitespace, and Multi-character Tokens
    else if (src[0] === "#") {
        while(src.length > 0 && (src[0] as string) !== "\n") {
            src.shift();
        }
    } 
 else if (src[0] === "\n") {
        line++;
        column = 1;
        src.shift();
        continue;
    } else if (/\s/.test(src[0])) {
      src.shift();
      column++;
      continue;
    } else if (/[0-9]/.test(src[0])) {
        let num = "";
        while (src.length > 0 && /[0-9.]/.test(src[0])) {
            num += src.shift();
            column++;
        }
        tokens.push({ value: num, type: TokenType.Number, line, column: column - num.length });
        continue;
    } else if (src[0] === '"') {
        const startLine = line;
        const startColumn = column;
        src.shift(); column++;
        let str = "";
        while (src.length > 0 && src[0] !== '"') {
            if (src[0] === '\\') {
                src.shift(); column++;
                const escapeChar = src.shift();
                column++;
                if (!escapeChar) break;
                switch (escapeChar) {
                    case 'n': str += '\n'; break;
                    case 'r': str += '\r'; break;
                    case 't': str += '\t'; break;
                    case 'b': str += '\b'; break;
                    case 'f': str += '\f'; break;
                    case 'v': str += '\v'; break;
                    case '\\': str += '\\'; break;
                    case '"': str += '"'; break;
                    case 'e': str += '\x1b'; break;
                    case 'x': {
                        let hex = (src.shift() || "") + (src.shift() || "");
                        column += 2;
                        str += String.fromCharCode(parseInt(hex, 16) || 0);
                        break;
                    }
                    default: str += escapeChar; break;
                }
            } else {
                str += src.shift();
                column++;
            }
        }
        if (src.length > 0 && src[0] === '"') {
            src.shift(); column++;
        }
        tokens.push({ value: str, type: TokenType.String, line: startLine, column: startColumn });
        continue;
    }
 else if (/[a-zA-Z_]/.test(src[0])) {
        let ident = "";
        while (src.length > 0 && /[a-zA-Z0-9_]/.test(src[0])) {
            ident += src.shift();
            column++;
        }
        
        const lowerIdent = ident.toLowerCase();
        const reserved = KEYWORDS[lowerIdent];
        if (reserved !== undefined) {
            tokens.push({ value: ident, type: reserved, line, column: column - ident.length });
        } else {
            tokens.push({ value: ident, type: TokenType.Identifier, line, column: column - ident.length });
        }
        continue;
    } else {
      console.error(`Unrecognized character found in source: ${src[0]} at line ${line}`);
      src.shift(); column++;
    }
    
    // Default increment for single char tokens handled by pushToken
    column++;
  }
  
  tokens.push({ type: TokenType.EOF, value: "EndOfFile", line, column });
  return tokens;
}
