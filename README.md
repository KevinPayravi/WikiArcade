# Wiki Arcade

A directory of web games powered by Wikipedia, Wikidata, Wikimedia Commons, and other wiki sites.

The games are presented in three "views":
* Grid
* Scroll (intended to resemble a classic arcade "game selection" screen)
* Arcade (a fancy navigation menu in an arcade cabinet)

## 📝 Listings

Games are listed in `games.json` in the following format:

```json
{
  "id": "unique-game-id",
  "name": "Game Name",
  "emoji": "🚀",
  "subtitle": "Classic Puzzle Game",
  "description": "Solve puzzles from data pulled from Wikidata",
  "author": "Jimbo Wales",
  "preview": "game.png",
  "status": "available",
  "url": "https://example.com"
}
```