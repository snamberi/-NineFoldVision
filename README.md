# NineFoldVision studio site

The home of every NineFoldVision game: the games, their updates, and the Vision universe story
(*The Seal of Earth Zero*). A plain static site with no build step and no dependencies (fonts are self-hosted in `site/assets/fonts`), in the same pixel-art style as our games
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
| `watch.html` | YouTube videos: latest uploads and pinned videos, each loaded only when played |
| `privacy.html` / `terms.html` | Privacy & cookies policy and terms of use |
| `press.html` | Press kit: fact sheet, copyable descriptions, logo and art downloads, contact |
| `read/ch-<n>.html` | Share link for each chapter: link previews show the chapter's title and card, then it opens the reader |
| `community.html` | Discord, YouTube, TikTok, Instagram and Reddit, the Ninefold account, player search |
| `profile.html?u=<name>` | A player's Ninefold profile: trophy showcase, Court Vision and Dragon Vision cards, friends, activity |

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
- **Email sign-up:** create a free account at [buttondown.com](https://buttondown.com) and put its username in
  `newsletter.buttondown` in `site/data/studio.js`. The "Get new chapters and updates" form then appears above
  the footer on every page. Subscribers and sending emails are managed in Buttondown.
- **Watch page:** set `youtube.channelId` in `site/data/studio.js` (YouTube Studio → Settings → Channel →
  Advanced settings) and the page shows your latest uploads. Add video or Shorts links to `youtube.pinned` to
  feature them. Players are click-to-play, so nothing loads from YouTube until a visitor presses play.
- **Legal pages:** `privacy.html` and `terms.html`. Fill in `legal.owner` and `legal.country` (and `email`) in
  `site/data/studio.js`. If you add a new service (analytics, ads, another embed), update the privacy policy, and
  anything that tracks visitors needs a consent banner before it loads.
- **Chapter share cards:** after editing the story, `node scripts/build-story.mjs` also rewrites `site/read/`, and
  `python3 scripts/build-share-cards.py` (needs Pillow) redraws the preview images in `site/assets/img/share/`.
  The reader's "Share this chapter" button shares these links.
- **Trophy names:** run `node scripts/sync-trophies.mjs` after either game adds achievements. It reads Court Vision
  (`frontOffice.ts`, `modeAchievements.ts`) and Dragon Vision (`achievements.ts`) and rewrites `site/data/trophies.js`.

## Ninefold accounts

The site signs players in with the same Supabase project as Court Vision (Discord or Google), so a player has one
username everywhere. Each game keeps its own progress in its own rows (Court Vision: `profiles` level/xp/stats,
`user_achievements`; Dragon Vision: `game_summaries`, `game_trophies`); the site only reads them. It writes just the
player's username, their `trophy_showcase` and `follows` (mutual follows are friends). Tables and policies are in
Court Vision's `supabase/migrations/2026-10-25-ninefold-accounts.sql`.

For sign-in to return here, add this site's address (e.g. `https://ninefoldvision.com/**`) to Supabase →
Authentication → URL Configuration → Redirect URLs.

## Preview and deploy

```bash
cd site && python3 -m http.server 8000   # http://localhost:8000
```

Deploy with Cloudflare Workers (see `wrangler.jsonc`), or any static host pointed at the `site` folder.
