/**
 * Builds the WHERE clause using FTS5 MATCH functionality.
 * @param {string} term - The search term entered by the user.
 * @param {boolean} searchAllColumns - If true, search all FTS5 columns; if false, restrict to "titel" column only.
 */
function buildSearchWhere(term, searchAllColumns = false) {
  if (!term || !term.trim()) {
    return { where: "WHERE DeletedDateTime IS NULL", params: []};
  }

  const trimmed = term.trim();
  const withImplicitPrefix = ensureLastWordWildcard(trimmed);
  // When searching titel only, wrap with FTS5 column filter syntax
  const searchTerm = searchAllColumns ? trimmed : `{titel} : (${withImplicitPrefix})`;

  return {
    where: "WHERE DeletedDateTime IS NULL AND quotes MATCH ? ",
    params: [searchTerm]
  };
}

function ensureLastWordWildcard(term) {
  if (!term || !/\s+/.test(term)) {
    return term;
  }

  return term.replace(/(\S+)$/, (lastToken) => {
    if (/\*$/.test(lastToken) || /^(AND|OR|NOT|NEAR)$/i.test(lastToken)) {
      return lastToken;
    }

    const punctMatch = lastToken.match(/^(.*?)([),.;:!?\]]+)$/);
    if (punctMatch) {
      const core = punctMatch[1];
      const punct = punctMatch[2];
      if (!core || /\*$/.test(core)) {
        return lastToken;
      }
      return `${core}*${punct}`;
    }

    return `${lastToken}*`;
  });
}

// Note: The old boolean search logic has been replaced with FTS5's built-in query syntax.
// FTS5 supports:
// - AND/OR operators: term1 AND term2, term1 OR term2
// - Phrase queries: "exact phrase"
// - - Prefix searches: term*
// - NEAR operator: NEAR(term1 term2)
// - Search for column names: titel:term, quelle:term, zitat:term, genutzt:term
// For more details see: https://sqlite.org/fts5.html#full_text_query_syntax
