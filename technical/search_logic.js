/**
 * Builds the WHERE clause using FTS5 MATCH functionality
 */
function buildSearchWhere(term) {
  if (!term || !term.trim()) {
    return { where: "WHERE DeletedDateTime IS NULL", params: []};
  }

  // Use FTS5 MATCH with the search term as is
  return {
    where: "WHERE DeletedDateTime IS NULL AND quotes MATCH ? ",
    params: [term.trim()]
  };
}

// Note: The old boolean search logic has been replaced with FTS5's built-in query syntax.
// FTS5 supports:
// - AND/OR operators: term1 AND term2, term1 OR term2
// - Phrase queries: "exact phrase"
// - - Prefix searches: term*
// - NEAR operator: NEAR(term1 term2)
// - Search for column names: titel:term, quelle:term, zitat:term, genutzt:term
// For more details see: https://sqlite.org/fts5.html#full_text_query_syntax
