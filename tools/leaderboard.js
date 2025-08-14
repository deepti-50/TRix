require('dotenv').config();
const sqlite3 = require('sqlite3'); const { open } = require('sqlite');
const { ethers } = require('ethers'); const express = require('express'); const fs = require('fs'); const path = require('path');
(async ()=>{
  const db = await open({ filename: './leaderboard.sqlite', driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS stats (addr TEXT PRIMARY KEY, wins INTEGER DEFAULT 0, matchesPlayed INTEGER DEFAULT 0, totalGTWon TEXT DEFAULT '0');`);
  const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545'; const provider = new ethers.JsonRpcProvider(RPC);
  function abi(n){ return JSON.parse(fs.readFileSync(path.join(__dirname,'../api/contractAbi/'+n+'.json'))); }
  const play = new ethers.Contract(process.env.PLAYGAME_ADDRESS, abi('PlayGame'), provider);
  play.on('Settled', async (matchId, winner, amount)=>{
    await db.run(`INSERT INTO stats(addr,wins,matchesPlayed,totalGTWon) VALUES(?,?,?,?)
      ON CONFLICT(addr) DO UPDATE SET wins=wins+1, matchesPlayed=matchesPlayed+1`, [winner.toLowerCase(),1,1,amount.toString()]);
    console.log('Settled', winner, amount.toString());
  });
  const app = express();
  app.get('/leaderboard', async (req,res)=>{ const rows=await db.all('SELECT addr, wins, matchesPlayed, totalGTWon FROM stats ORDER BY wins DESC LIMIT 10'); res.json(rows); });
  app.listen(process.env.LEADERBOARD_PORT||4000, ()=>console.log('Leaderboard on http://localhost:'+ (process.env.LEADERBOARD_PORT||4000) +'/leaderboard'));
})().catch(console.error);
