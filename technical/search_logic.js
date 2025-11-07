/**
 * Erweitertes WHERE für SQLite-Suche mit boolescher Syntax.
 * Unterstützt: AND, OR, NOT, Klammern, implizites AND, optionale Phrasen in "..."
 */
function buildSearchWhere(term) {
  // Basis: gelöschte Einträge immer ausschließen
  const baseWhere = "WHERE DeletedDateTime IS NULL";
  const columns = ["titel", "quelle", "zitat", "genutzt"];

  if (!term || !term.trim()) {
    return { where: baseWhere, params: [] };
  }

  // Kompiliere die boolesche Suche in SQL
  const { sql, params } = compileBooleanSearch(term, columns);

  const where = `${baseWhere} AND (${sql})`;
  return { where, params };
}

/**
 * Übersetzt eine Bool-Query (AND/OR/NOT, Klammern, Phrasen) in SQL + Parameter.
 * @param {string} query - z.B. `(Äpfel OR Birnen OR Auto) AND Testsieger AND NOT (Ferrari OR Porsche)`
 * @param {string[]} columns - Spalten, die mit LIKE durchsucht werden sollen
 * @returns {{ sql: string, params: any[] }}
 */
function compileBooleanSearch(query, columns) {
  const tokens = insertImplicitAnd(tokenizeBooleanQuery(query));
  const rpn = toRPN(tokens);
  const { sql, params } = rpnToSql(rpn, columns);
  return { sql, params };
}

/* ============================
  Tokenizer
  ============================ */

/**
 * Zerlegt die Query in Tokens: TERM, AND, OR, NOT, LPAREN, RPAREN.
 * Unterstützt Phrasen in "..." oder '...'.
 */
function tokenizeBooleanQuery(input) {
  const tokens = [];
  let i = 0;

  const isSpace = (c) => /\s/.test(c);

  while (i < input.length) {
    const ch = input[i];

    if (isSpace(ch)) {
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // Phrasen in Anführungszeichen
    if (ch === `"` || ch === `'`) {
      const quote = ch;
      i++;
      let value = "";
      while (i < input.length) {
        const c = input[i];
        if (c === "\\") {
          // Escape: übernehme nächstes Zeichen wörtlich
          if (i + 1 < input.length) {
            value += input[i + 1];
            i += 2;
            continue;
          }
        }
        if (c === quote) {
          i++; // schließendes Quote konsumieren
          break;
        }
        value += c;
        i++;
      }
      if (value.length > 0) {
        tokens.push({ type: "TERM", value });
      }
      continue;
    }

    // Normale Wörter (bis Space oder Klammer)
    let start = i;
    while (i < input.length && !/\s|\(|\)/.test(input[i])) {
      i++;
    }
    const word = input.slice(start, i);
    const upper = word.toUpperCase();

    if (upper === "AND" || upper === "OR" || upper === "NOT") {
      tokens.push({ type: upper });
    } else {
      tokens.push({ type: "TERM", value: word });
    }
  }

  return tokens;
}

/**
 * Fügt implizite ANDs zwischen benachbarten Ausdrücken ein:
 * TERM ( oder ) TERM oder ) ( oder TERM NOT oder ) NOT -> zwischen diese Paare kommt AND
 */
function insertImplicitAnd(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0) {
      const p = tokens[i - 1];
      const isLeft = p.type === "TERM" || p.type === "RPAREN";
      const isRight = t.type === "TERM" || t.type === "LPAREN" || t.type === "NOT";
      if (isLeft && isRight) {
        out.push({ type: "AND" });
      }
    }
    out.push(t);
  }
  return out;
}

/* ============================
  Shunting-Yard -> RPN
  ============================ */

function toRPN(tokens) {
  const output = [];
  const ops = [];

  const precedence = { OR: 1, AND: 2, NOT: 3 };
  // NOT ist unär (rechtsassoziativ), AND/OR binär (linksassoziativ)
  const isOp = (t) => t && (t.type === "OR" || t.type === "AND" || t.type === "NOT");

  for (const tok of tokens) {
    if (tok.type === "TERM") {
      output.push(tok);
      continue;
    }

    if (tok.type === "AND" || tok.type === "OR" || tok.type === "NOT") {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (
          isOp(top) &&
          (
            precedence[top.type] > precedence[tok.type] ||
            (precedence[top.type] === precedence[tok.type] && tok.type !== "NOT") // NOT rechtsassoziativ
          )
        ) {
          output.push(ops.pop());
        } else {
          break;
        }
      }
      ops.push(tok);
      continue;
    }

    if (tok.type === "LPAREN") {
      ops.push(tok);
      continue;
    }

    if (tok.type === "RPAREN") {
      while (ops.length && ops[ops.length - 1].type !== "LPAREN") {
        output.push(ops.pop());
      }
      if (!ops.length) {
        throw new Error("Unbalancierte Klammern in der Suchanfrage.");
      }
      ops.pop(); // LPAREN entfernen
      continue;
    }
  }

  while (ops.length) {
    const op = ops.pop();
    if (op.type === "LPAREN" || op.type === "RPAREN") {
      throw new Error("Unbalancierte Klammern in der Suchanfrage.");
    }
    output.push(op);
  }

  return output;
}

/* ============================
  RPN -> SQL
  ============================ */

function rpnToSql(rpn, columns, options = {}) {
  const fallbackSql = options.fallbackSql || "1=1"; // Tautologie bei leerem/ungültigem Ausdruck
  const stack = [];

  const safePop = () => (stack.length ? stack.pop() : undefined);

  for (const tok of rpn) {
    if (tok.type === "TERM") {
      stack.push(makeTermClause(tok.value, columns));
      continue;
    }

    if (tok.type === "NOT") {
      const a = safePop();
      if (!a) {
        // unvollständiger NOT – ignorieren
        continue;
      }
      stack.push({
        sql: `NOT (${a.sql})`,
        params: a.params
      });
      continue;
    }

    if (tok.type === "AND" || tok.type === "OR") {
      const b = safePop();
      const a = safePop();

      if (a && b) {
        stack.push({
          sql: `(${a.sql}) ${tok.type} (${b.sql})`,
          params: a.params.concat(b.params)
        });
      } else if (a || b) {
        // Nur ein Operand vorhanden – Operator ignorieren, Operand zurück auf den Stack
        stack.push(a || b);
      } else {
        // Gar kein Operand – nichts tun
      }
      continue;
    }

    // Unbekannte Token-Typen stillschweigend ignorieren
  }

  if (stack.length === 0) {
    return { sql: fallbackSql, params: [] };
  }

  // Falls mehrere Fragmente übrig sind, konservativ mit AND zusammenfalten
  let acc = stack[0];
  for (let i = 1; i < stack.length; i++) {
    const cur = stack[i];
    acc = {
      sql: `(${acc.sql}) AND (${cur.sql})`,
      params: acc.params.concat(cur.params)
    };
  }

  return acc;
}


/* ============================
  Hilfen: LIKE
  ============================ */

/**
 * Escaped %, _ und \ für LIKE (wir nutzen ESCAPE '\').
 * Hinweis: Wenn du Nutzern Wildcards erlauben willst (z.B. * => %), 
 * dann ersetze * erst durch % und rufe DANACH diese Funktion NICHT mehr auf
 * oder setze allowWildcards=true und passe die Logik an.
 */
function escapeLikePattern(s) {
  return s.replace(/([%_\\])/g, "\\$1");
}

/**
 * Erzeugt die OR-Verknüpfung über alle Spalten für einen Suchterm.
 * Verwendet `ESCAPE '\'` damit unser Escaping greift.
 */
function makeTermClause(rawTerm, columns) {
  const term = String(rawTerm || "").trim();
  // OPTIONAL: Wildcards erlauben
  // const userWild = term.replace(/\*/g, "%").replace(/\?/g, "_");
  // const pattern = `%${userWild}%`;

  // Standard: Wildcards im Input neutralisieren (literal suchen)
  const pattern = `%${escapeLikePattern(term)}%`;

  const cond = "(" + columns.map(c => `COALESCE(${c}, '') LIKE ? ESCAPE '\\'`).join(" OR ") + ")";
  const params = columns.map(() => pattern);
  return { sql: cond, params };
}