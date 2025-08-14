require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs'); const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : null;

function abi(name){ return JSON.parse(fs.readFileSync(path.join(__dirname,'contractAbi', name+'.json'))); }
const addrs = { gt: process.env.GAMETOKEN_ADDRESS, store: process.env.TOKENSTORE_ADDRESS, play: process.env.PLAYGAME_ADDRESS };
const c = {
  gt: addrs.gt ? new ethers.Contract(addrs.gt, abi('GameToken'), wallet || provider) : null,
  store: addrs.store ? new ethers.Contract(addrs.store, abi('TokenStore'), wallet || provider) : null,
  play: addrs.play ? new ethers.Contract(addrs.play, abi('PlayGame'), wallet || provider) : null,
};

app.get('/health', (req,res)=>res.json({ok:true}));

app.get('/purchase', async (req,res)=>{
  try{
    if(!c.store || !wallet) throw new Error('store/wallet not set');
    const amt = req.query.amount; if(!amt) return res.status(400).json({error:'amount required'});
    const usdtAmount = ethers.parseUnits(String(amt), 6);
    const tx = await c.store.connect(wallet).buy(usdtAmount);
    const rc = await tx.wait();
    res.json({txHash: rc.hash, usdtAmount: usdtAmount.toString()});
  }catch(e){res.status(500).json({error:String(e)})}
});

app.post('/match/start', async (req,res)=>{
  try{
    const { matchId, p1, p2, stake } = req.body;
    if(!matchId || !p1 || !p2 || !stake) return res.status(400).json({error:'matchId,p1,p2,stake required'});
    const id = ethers.keccak256(ethers.toUtf8Bytes(matchId));
    const tx = await c.play.connect(wallet).createMatch(id, p1, p2, stake);
    const rc = await tx.wait();
    res.json({txHash: rc.hash, matchIdBytes32: id});
  }catch(e){res.status(500).json({error:String(e)})}
});

app.post('/match/result', async (req,res)=>{
  try{
    const { matchIdBytes32, winner } = req.body;
    const tx = await c.play.connect(wallet).commitResult(matchIdBytes32, winner);
    const rc = await tx.wait();
    res.json({txHash: rc.hash});
  }catch(e){res.status(500).json({error:String(e)})}
});

// Minimal matchmaking
const mm = { queue: [], tickets: new Map() };
const ticket = ()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

app.post('/queue', async (req,res)=>{
  try{
    const { player, stake } = req.body;
    if(!player || !stake) return res.status(400).json({error:'player,stake required'});
    const t = ticket();
    const entry = { player: ethers.getAddress(player), stake: BigInt(stake), status:'QUEUED', matchIdBytes32:null, opponent:null, startAt:null };
    mm.tickets.set(t, entry);
    const idx = mm.queue.findIndex(e=>e.stake===entry.stake && e.player!==entry.player);
    if(idx>=0){
      const other = mm.queue.splice(idx,1)[0];
      const key = 'm-'+other.player+'-'+entry.player+'-'+Date.now();
      const id = ethers.keccak256(ethers.toUtf8Bytes(key));
      const tx = await c.play.connect(wallet).createMatch(id, other.player, entry.player, entry.stake);
      await tx.wait();
      entry.status = other.status = 'MATCHED';
      entry.matchIdBytes32 = other.matchIdBytes32 = id;
      entry.opponent = other.player; other.opponent = entry.player;
    } else { mm.queue.push(entry); }
    res.json({ ticket: t });
  }catch(e){res.status(500).json({error:String(e)})}
});

app.get('/state', (req,res)=>{
  const t = req.query.ticket;
  if(!t || !mm.tickets.has(t)) return res.status(404).json({error:'invalid ticket'});
  res.json(mm.tickets.get(t));
});

app.post('/ready', (req,res)=>{
  const t = req.body.ticket;
  if(!t || !mm.tickets.has(t)) return res.status(404).json({error:'invalid ticket'});
  const a = mm.tickets.get(t);
  if(a.status!=='MATCHED') return res.status(400).json({error:'not matched'});
  a.status='READY';
  const other = [...mm.tickets.entries()].find(([k,v])=>v.matchIdBytes32===a.matchIdBytes32 && k!==t);
  if(other && other[1].status==='READY'){
    const startAt = Math.floor(Date.now()/1000)+5;
    a.startAt = other[1].startAt = startAt;
    a.status = other[1].status = 'STARTING';
  }
  res.json({ ok:true, state:a });
});

app.post('/submit-score', async (req,res)=>{
  try{
    const { ticket: tk, winner } = req.body;
    if(!tk || !winner || !mm.tickets.has(tk)) return res.status(400).json({error:'ticket,winner required'});
    const a = mm.tickets.get(tk);
    const tx = await c.play.connect(wallet).commitResult(a.matchIdBytes32, ethers.getAddress(winner));
    const rc = await tx.wait();
    a.status='SETTLED';
    res.json({txHash: rc.hash});
  }catch(e){res.status(500).json({error:String(e)})}
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, ()=>console.log('API on http://localhost:'+PORT));
