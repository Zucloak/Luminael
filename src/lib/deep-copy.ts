export function deepCopyTokens(tokens) {
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
