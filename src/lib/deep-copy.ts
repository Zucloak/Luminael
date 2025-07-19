import { Token } from "@/components/tools/Calculator";

export function deepCopyTokens(tokens: Token[]): Token[] {
  return tokens.map(token => {
    if (token.type === 'fraction') {
      return {
        ...token,
        numerator: deepCopyTokens(token.numerator),
        denominator: deepCopyTokens(token.denominator),
      };
    }
    return { ...token };
  });
}
