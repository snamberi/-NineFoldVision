# NineFoldVision studio site

The home of every NineFoldVision game: the games, their updates, and the Vision universe story
(*The Seal of Earth Zero*). A plain static site with no build step and no dependencies, in the same pixel-art style as our games
(Press Start 2P and VT323, notched pixel frames, hard shadows). The story itself is set in a book face for
comfortable reading.

## Pages

| Page | What it shows |
| --- | --- |
| `index.html` | Studio home: games, latest news and patch notes, the story |
| `games.html` / `game.html?g=<slug>` | The games catalog and one page per game, with its full update history |
| `updates.html` | Studio news and every game's patch notes, filterable by game and searchable |
| `universe.html` | The Vision universe guide: nine Earths, people, laws, the five Gods, places, open threads |
| `story.html` | The chapter reader (`story.html#ch-12` opens chapter 12) |
| `about.html` | The studio, brand assets, contact |

**Spoilers.** On the Universe page, anything marked `class="spoiler" data-ch="N"` stays blurred until the
visitor has reached chapter N in the reader (progress is saved in their browser). They can also tap an item
or switch "Show all spoilers" on.

## Adding things

- **A new game:** add an entry to `site/data/games.js`. It appears on Home, Games and Updates and gets its own
  page. While it's unannounced, the "In the forge" card holds its place.
- **A game update:** add the release in the game's own repo as usual, then run `node scripts/sync-updates.mjs` here.
  It reads every game listed in `scripts/update-sources.json` (Court Vision's `whatsNew.ts`, Dragon Vision's
  `changelog.ts`) from checkouts next to this repo (`../CourtVision`, `../dragonvision`) and rewrites
  `site/data/game-updates.js`. A new game needs one line in that file.
- **Studio news:** add a post to the top of `site/data/news.js`.
- **Story:** edit `content/books/the-seal-of-earth-zero.md` (`## Chapter N: Title` headings), or add a new book
  next to it with `book: 2` in its front matter, then run `node scripts/build-story.mjs`.
- **Contact email and social links:** `site/data/studio.js`. They're hidden until filled in.

## Preview and deploy

```bash
cd site && python3 -m http.server 8000   # http://localhost:8000
```

Deploy with Cloudflare Workers (see `wrangler.jsonc`), or any static host pointed at the `site` folder.
