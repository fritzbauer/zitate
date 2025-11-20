Zitate
======

A small client-side web project for browsing and searching a collection of quotes.

- The UI and logic are in the `technical/` folder (HTML/JS/CSS).
- Open `index.html` or `import.html` in a browser to run the app locally.

Custom sql.js build
-------------------

This project uses a custom build of `sql.js` that has been extended with the SQLite FTS5 extension and the `fts5-snowball` stemmer to provide improved
full-text search and language-specific stemming.

The custom build is obtained from: https://github.com/fritzbauer/sql.js

Files from that build used in this repo include `technical/sql-wasm.js` and `technical/sql-wasm.wasm`.

License
-------

See the `LICENSE` file in this repository for licensing details.

The fts5-snowball plugin originates from:
https://github.com/abiliojr/fts5-snowball
Copyright (c) 2016, Abilio Marques

The snowball plugin originates from:
https://github.com/snowballstem/snowball/

Copyright (c) 2001, Dr Martin Porter
Copyright (c) 2004,2005, Richard Boulton
Copyright (c) 2013, Yoshiki Shibukawa
Copyright (c) 2006-2025, Olly Betts
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

  1. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.
  2. Redistributions in binary form must reproduce the above copyright notice,
     this list of conditions and the following disclaimer in the documentation
     and/or other materials provided with the distribution.
  3. Neither the name of the Snowball project nor the names of its contributors
     may be used to endorse or promote products derived from this software
     without specific prior written permission.
