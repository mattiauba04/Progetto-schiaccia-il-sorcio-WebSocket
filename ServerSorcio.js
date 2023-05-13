const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const players = new Map();
let score = new Map();
let moleX = Math.round(Math.random() * 700);
let moleY = Math.round(Math.random() * 500);
var gameStarted = false;
let gameTimer = null;
let moleTimer = null;
let tempo = 0;

wss.on('connection', (ws) => {
  console.log('Connessione WebSocket stabilita');

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Messaggio ricevuto:', message);
    switch (message.type) {
      case 'join-game':
        joinGame(message.name, ws);
        break;
     case 'start-game':
        startGame();
        break;
     case 'stop-game':
        stopGame();
        break;
     case 'generate':
        generateMole(ws);
        break;
      case 'mole-hit':
        hitMole(message.name);
        break;
      default:
        console.log('Tipo di messaggio sconosciuto:', message.type);
        break;
    }
  });

  ws.on('close', () => {
    const playerId = getPlayerId(ws);
    if (playerId) {
      players.delete(playerId);
      score.delete(playerId);
      console.log('Il giocatore', playerId, 'ha lasciato il gioco');
    }
  });
});

function stopGame(){
  gameStarted = false;
}

function getPlayerId(ws) {
  for (const [playerId, playerWs] of players.entries()) {
    if (playerWs === ws) {
      return playerId;
    }
  }
  return null;
}

function joinGame(name, ws) {
  if (!gameStarted) {
    console.log('Il giocatore' + name + 'si è unito al gioco');
    players.set(name, ws);
    score.set(name, 0);
    ws.send(JSON.stringify({ type: 'joined-game', name }));
    //ws.send(JSON.stringify({ type: 'generate', x: moleX, y: moleY }));
    broadcast({ type: 'player-joined', name });
    console.log(score);
  }
}

function startGame() {
  if (!gameStarted) {
    console.log('Avvio del gioco...');
    gameStarted = true;
    score.clear();
    tempo = 0;
    broadcast({ type: 'game-start' });
    gameTimer = setInterval(() => {
      broadcast({ type: 'game-tick', time: 20 - tempo });
      generateMole();
    }, 1000);    
  }
}

function generateMole(ws) {
  moleX = Math.round(Math.random() * 700);
  moleY = Math.round(Math.random() * 500);
  broadcast({ type: 'generate', x: moleX, y: moleY });
  tempo++;
}

function hitMole(name) {
  const playerWs = players.get(name);
  if (playerWs) {
    console.log('Il giocatore', name, 'ha colpito la talpa!');
    score.set(name, (score.get(name) || 0) + 1);
    console.log(score);
    if (tempo >= 20) {
      endGame();
    }
  }
}

function endGame() {
  console.log('Fine del gioco!');
  gameStarted = false;
  clearTimeout(moleTimer);
  clearInterval(gameTimer);
  const scores = Array.from
(score.entries());
scores.sort((a, b) => b[1] - a[1]);
broadcast({ type: 'game-over', scores });
score.clear();
}

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const playerWs of players.values()) {
    playerWs.send(data);
  }
}