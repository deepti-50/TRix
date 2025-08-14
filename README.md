# Game Platform — Full Integration (Round 1 + Round 2)

## What’s inside
- contracts/: GameToken, TokenStore, PlayGame, MockUSDT
- deploy/: deploy script (local + testnet)
- api/: Express backend + matchmaking + contract calls
- web-game/: Reflex Duel web game (HTML/JS)
- tools/: Leaderboard listener (SQLite)

## Run Locally
1) Install
```
npm install
```
2) Start local chain
```
npx hardhat node
```
3) Deploy
```
npm run deploy:local
# copy printed addresses
cp api/.env.example api/.env
# paste addresses + PRIVATE_KEY (use one from hardhat node accounts list)
npm run start:api
npm run leaderboard
npm run start:web
```
Open http://localhost:8080
