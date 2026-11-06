# Exampel 2 — Rock Paper Scissors

A copy of the original Exampel Rock Paper Scissors game with an optional online room mode.

## Play

- Play against the computer with the three move buttons, keyboard shortcuts (R, P, S), or Auto Play.
- Select **Join Room** to create a room or enter a friend's four-character room code.
- Share the room invite link or code. Rooms support two players.
- Select **Leave Room** to return to computer mode.

## Multiplayer server

The separate Cloudflare Worker is `exampel-2-server`. It uses a Durable Object namespace named `GAME_ROOMS` to manage two-player WebSocket rooms.

Health check: https://exampel-2-server.heyboernathan.workers.dev/health

## Files

- `index.html` — game page and room lobby
- `12-rock-paper-scissors.css` — original styling plus room panel styling
- `12-rock-paper-scissors.js` — computer game and multiplayer client

The original `Exampel` repository and its server are separate and have not been changed.