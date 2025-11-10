#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sqlite3
from pathlib import Path
from typing import Iterator, Tuple, List, Optional
import sys
import os
import time

LOREM_GENUZT = (
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. "
    "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, "
    "when an unknown printer took a galley of type and scrambled it to make a type specimen book. "
    "It has survived not."
)

CREATE_TABLE_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS quotes USING fts5(
      titel,
      quelle,
      zitat,
      genutzt,
      DeletedDateTime UNINDEXED
    );
"""

INSERT_SQL = """
INSERT INTO quotes (titel, quelle, zitat, genutzt, DeletedDateTime)
VALUES (?, ?, ?, ?, NULL);
"""

def init_db(db_path: Path) -> sqlite3.Connection:
    """Create/connect DB, apply PRAGMAs, ensure table exists."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")      # Better concurrency & durability
    conn.execute("PRAGMA synchronous=NORMAL;")    # Speed up inserts (still safe with WAL)
    conn.execute("PRAGMA temp_store=MEMORY;")     # Keep temp data in memory
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute(CREATE_TABLE_SQL)
    conn.commit()
    return conn

def iter_files(root: Path) -> Iterator[Path]:
    """Yield all files under root (recursively)."""
    for p in root.rglob("*"):
        if p.is_file():
            yield p

def read_file_as_text(p: Path, max_bytes: Optional[int] = None) -> str:
    """
    Read file content as UTF-8 text.
    - Reads as binary, then decode('utf-8', errors='ignore') to handle mixed encodings/binaries.
    - Optionally limit size with max_bytes to avoid huge loads.
    """
    try:
        if max_bytes is not None and max_bytes > 0:
            with p.open("rb") as f:
                data = f.read(max_bytes)
        else:
            data = p.read_bytes()
        return data.decode("utf-8", errors="ignore")
    except Exception as e:
        return f"[FEHLER beim Lesen: {e}]"

def to_row(file_path: Path, genutzt_text: str) -> Tuple[str, str, str, str]:
    titel = file_path.name
    quelle = str(file_path.resolve())
    zitat = read_file_as_text(file_path)  # Du kannst max_bytes=... setzen, wenn nötig.
    return (titel, quelle, zitat, genutzt_text)

def batch_insert(conn: sqlite3.Connection, rows: List[Tuple[str, str, str, str]]) -> None:
    """Insert rows in a single transaction."""
    with conn:  # context manager => BEGIN/COMMIT
        conn.executemany(INSERT_SQL, rows)

def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Erstellt eine SQLite DB und füllt Tabelle 'quotes' mit Dateien aus einem Ordner."
    )
    p.add_argument(
        "--db",
        required=True,
        type=Path,
        help="Pfad zur SQLite-Datei (wird erstellt, falls nicht vorhanden)."
    )
    p.add_argument(
        "--root",
        required=True,
        type=Path,
        help="Wurzelordner, der rekursiv nach Dateien durchsucht wird."
    )
    p.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Anzahl Datensätze pro Insert-Batch (Standard: 500)."
    )
    p.add_argument(
        "--max-files",
        type=int,
        default=None,
        help="Optional: Verarbeitung auf n Dateien begrenzen (zum Testen)."
    )
    p.add_argument(
        "--limit-bytes",
        type=int,
        default=None,
        help="Optional: Maximal X Bytes pro Datei einlesen (z. B. 1048576 für 1MB)."
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="Ausführliche Fortschrittsausgabe."
    )
    return p

def main():
    args = build_arg_parser().parse_args()

    root: Path = args.root
    db_path: Path = args.db
    batch_size: int = args.batch_size
    max_files: Optional[int] = args.max_files
    limit_bytes: Optional[int] = args.limit_bytes
    verbose: bool = args.verbose

    if not root.exists() or not root.is_dir():
        print(f"Fehler: Wurzelordner existiert nicht oder ist kein Ordner: {root}", file=sys.stderr)
        sys.exit(1)

    # DB initialisieren
    conn = init_db(db_path)
    if verbose:
        print(f"DB initialisiert: {db_path.resolve()}")

    # Dateien einsammeln
    files_iter = iter_files(root)

    rows: List[Tuple[str, str, str, str]] = []
    total = 0
    inserted = 0
    start = time.time()

    try:
        for file_path in files_iter:
            total += 1
            # Optional Limit für Testläufe
            if max_files is not None and total > max_files:
                break

            # Datei lesen (ggf. größenbegrenzt)
            try:
                if limit_bytes is not None and limit_bytes > 0:
                    # Lokale Überschreibung der read-Funktion
                    def read_file_as_text_limited(pth: Path) -> str:
                        try:
                            with pth.open("rb") as f:
                                data = f.read(limit_bytes)
                            return data.decode("utf-8", errors="ignore")
                        except Exception as e:
                            return f"[FEHLER beim Lesen: {e}]"
                    zitat = read_file_as_text_limited(file_path)
                else:
                    zitat = read_file_as_text(file_path)
            except Exception as e:
                zitat = f"[FEHLER beim Lesen: {e}]"

            row = (file_path.name, str(file_path.resolve()), zitat, LOREM_GENUZT)
            rows.append(row)

            # Batch einfügen
            if len(rows) >= batch_size:
                batch_insert(conn, rows)
                inserted += len(rows)
                if verbose:
                    print(f"Eingefügt: {inserted} / verarbeitet: {total}")
                rows.clear()

        # Restliche Datensätze
        if rows:
            batch_insert(conn, rows)
            inserted += len(rows)
            if verbose:
                print(f"Eingefügt: {inserted} / verarbeitet: {total} (finaler Batch)")

        conn.execute("INSERT INTO quotes(quotes, rank) VALUES('rank', 'bm25(10.0, 5.0, 8.0, 2.0)')")
        conn.execute("INSERT INTO quotes(quotes) VALUES('rebuild')")
        conn.execute("INSERT INTO quotes(quotes) VALUES('optimize')")

    finally:
        conn.close()

    dur = time.time() - start
    print(f"Fertig. Verarbeitet: {total} Dateien, Eingefügt: {inserted} Datensätze in {dur:.1f}s.")

if __name__ == "__main__":
    main()