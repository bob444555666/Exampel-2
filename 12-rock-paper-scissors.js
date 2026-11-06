const MULTIPLAYER_SERVER = 'https://exampel-2-server.heyboernathan.workers.dev';

let score = JSON.parse(localStorage.getItem('score')) || {
  wins: 0,
  losses: 0,
  ties: 0
};

let isAutoPlaying = false;
let intervalId;
let roomSocket = null;
let currentRoomCode = '';
let multiplayerPlayerIndex = null;
let multiplayerConnected = false;
let hasSubmittedMove = false;

updateScoreElement();

function autoPlay() {
  if (roomSocket && roomSocket.readyState === WebSocket.OPEN) return;
  if (!isAutoPlaying) {
    intervalId = setInterval(() => {
      playGame(pickComputerMove());
    }, 1000);
    isAutoPlaying = true;
  } else {
    clearInterval(intervalId);
    isAutoPlaying = false;
  }
}

document.querySelector('.js-rock-button').addEventListener('click', () => handleMove('rock'));
document.querySelector('.js-paper-button').addEventListener('click', () => handleMove('paper'));
document.querySelector('.js-scissors-button').addEventListener('click', () => handleMove('scissors'));

document.body.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.key.toLowerCase() === 'r') handleMove('rock');
  else if (event.key.toLowerCase() === 'p') handleMove('paper');
  else if (event.key.toLowerCase() === 's') handleMove('scissors');
});

function handleMove(move) {
  if (roomSocket && roomSocket.readyState === WebSocket.OPEN) {
    if (!multiplayerConnected) {
      setRoomStatus('Waiting for your friend to join…');
      return;
    }
    if (hasSubmittedMove) {
      setRoomStatus('Your move is locked in. Waiting for the other player…');
      return;
    }
    roomSocket.send(JSON.stringify({ type: 'move', move }));
    hasSubmittedMove = true;
    setRoomStatus('Move locked in. Waiting for the other player…');
    document.querySelector('.js-result').textContent = 'Waiting for opponent…';
    document.querySelector('.js-moves').innerHTML = 'Your move: ' + move;
    return;
  }
  playGame(move);
}

function playGame(playerMove) {
  const computerMove = pickComputerMove();
  let result = '';

  if (playerMove === computerMove) result = 'Tie.';
  else if (
    (playerMove === 'rock' && computerMove === 'scissors') ||
    (playerMove === 'paper' && computerMove === 'rock') ||
    (playerMove === 'scissors' && computerMove === 'paper')
  ) result = 'You win.';
  else result = 'You lose.';

  if (result === 'You win.') score.wins += 1;
  else if (result === 'You lose.') score.losses += 1;
  else score.ties += 1;

  localStorage.setItem('score', JSON.stringify(score));
  updateScoreElement();
  document.querySelector('.js-result').textContent = result;
  document.querySelector('.js-moves').innerHTML =
    'You <img src="https://raw.githubusercontent.com/bob444555666/Exampel/main/images/' + playerMove + '-emoji.png" class="move-icon" alt="' + playerMove + '">' +
    ' <img src="https://raw.githubusercontent.com/bob444555666/Exampel/main/images/' + computerMove + '-emoji.png" class="move-icon" alt="' + computerMove + '"> Computer';
}

function updateScoreElement() {
  document.querySelector('.js-score').textContent =
    'Wins: ' + score.wins + ', Losses: ' + score.losses + ', Ties: ' + score.ties;
}

function pickComputerMove() {
  const randomNumber = Math.random();
  if (randomNumber < 1 / 3) return 'rock';
  if (randomNumber < 2 / 3) return 'paper';
  return 'scissors';
}

// Room lobby and online match
const roomPanel = document.getElementById('room-panel');
const roomError = document.getElementById('room-error');
const roomDetails = document.getElementById('room-details');
const roomStatus = document.getElementById('room-status');
const roomCodeLabel = document.getElementById('room-code');
const modeStatus = document.getElementById('mode-status');

document.getElementById('open-room').addEventListener('click', () => {
  roomPanel.hidden = !roomPanel.hidden;
  roomError.textContent = '';
});
document.getElementById('close-room').addEventListener('click', () => roomPanel.hidden = true);
document.getElementById('create-room').addEventListener('click', createRoom);
document.getElementById('join-room').addEventListener('click', () => {
  joinRoom(document.getElementById('room-code-input').value);
});
document.getElementById('room-code-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') joinRoom(event.currentTarget.value);
});
document.getElementById('leave-room').addEventListener('click', leaveRoom);
document.getElementById('copy-room').addEventListener('click', async () => {
  const invite = new URL(window.location.href);
  invite.searchParams.set('room', currentRoomCode);
  try {
    await navigator.clipboard.writeText(invite.toString());
    setRoomStatus('Invite link copied. Send it to your friend!');
  } catch {
    setRoomStatus('Room code: ' + currentRoomCode + ' (copy it and send it to your friend)');
  }
});

async function createRoom() {
  roomError.textContent = '';
  try {
    const response = await fetch(MULTIPLAYER_SERVER + '/room', { method: 'POST' });
    if (!response.ok) throw new Error('The room server returned an error.');
    const data = await response.json();
    if (!data.roomCode) throw new Error('The server did not return a room code.');
    connectToRoom(data.roomCode);
  } catch (error) {
    roomError.textContent = 'Could not create a room. Check your connection and try again.';
    console.error(error);
  }
}

function joinRoom(code) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{4}$/.test(cleanCode)) {
    roomError.textContent = 'Enter a valid 4-character room code.';
    return;
  }
  roomError.textContent = '';
  connectToRoom(cleanCode);
}

function connectToRoom(code) {
  if (isAutoPlaying) {
    clearInterval(intervalId);
    isAutoPlaying = false;
  }
  leaveRoom(false);
  currentRoomCode = code;
  hasSubmittedMove = false;
  multiplayerConnected = false;
  multiplayerPlayerIndex = null;
  roomCodeLabel.textContent = code;
  roomDetails.hidden = false;
  setRoomStatus('Connecting to room…');
  const socketUrl = MULTIPLAYER_SERVER.replace(/^https:/, 'wss:') + '/room/' + code;
  roomSocket = new WebSocket(socketUrl);

  roomSocket.addEventListener('open', () => {
    modeStatus.textContent = 'Connecting to friend…';
    const invite = new URL(window.location.href);
    invite.searchParams.set('room', code);
    history.replaceState({}, '', invite.toString());
  });

  roomSocket.addEventListener('message', event => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === 'connected') {
      multiplayerPlayerIndex = data.playerIndex;
      setRoomStatus(data.count === 2 ? 'Friend connected. Choose your move!' : 'Room created. Waiting for your friend…');
    } else if (data.type === 'players') {
      multiplayerConnected = data.count === 2;
      if (multiplayerConnected) {
        setRoomStatus('Both players are here. Choose rock, paper, or scissors!');
        modeStatus.textContent = 'Online match · Room ' + code;
      } else {
        setRoomStatus('Waiting for your friend to join…');
        modeStatus.textContent = 'Online room · Waiting for friend';
      }
    } else if (data.type === 'move-locked') {
      setRoomStatus('Your move is locked in. Waiting for the other player…');
    } else if (data.type === 'opponent-moved') {
      setRoomStatus('Your friend has chosen. Make your move!');
    } else if (data.type === 'round') {
      hasSubmittedMove = false;
      if (data.outcome === 'win') score.wins += 1;
      else if (data.outcome === 'lose') score.losses += 1;
      else score.ties += 1;
      localStorage.setItem('score', JSON.stringify(score));
      updateScoreElement();
      const own = data.yourMove;
      const other = data.opponentMove;
      const outcome = data.outcome;
      if (outcome === 'win') document.querySelector('.js-result').textContent = 'You win!';
      else if (outcome === 'lose') document.querySelector('.js-result').textContent = 'You lose!';
      else document.querySelector('.js-result').textContent = 'Tie!';
      document.querySelector('.js-moves').textContent = 'You: ' + own + '  |  Friend: ' + other;
      setRoomStatus('Round finished. Choose again for the next round.');
    } else if (data.type === 'room-full') {
      roomError.textContent = 'That room already has two players.';
      leaveRoom(false);
    } else if (data.type === 'chat') {
      // Reserved for room chat; no chat interface is shown in this simple version.
    }
  });

  roomSocket.addEventListener('close', () => {
    multiplayerConnected = false;
    modeStatus.textContent = 'Playing against the computer';
    if (currentRoomCode) setRoomStatus('Disconnected from the room.');
  });
  roomSocket.addEventListener('error', () => {
    roomError.textContent = 'Could not connect to the multiplayer server. Please try again.';
  });
}

function leaveRoom(clearCode = true) {
  if (roomSocket) {
    const oldSocket = roomSocket;
    roomSocket = null;
    oldSocket.close();
  }
  multiplayerConnected = false;
  hasSubmittedMove = false;
  multiplayerPlayerIndex = null;
  modeStatus.textContent = 'Playing against the computer';
  if (clearCode) {
    currentRoomCode = '';
    roomDetails.hidden = true;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('room');
    history.replaceState({}, '', cleanUrl.toString());
  }
}

function setRoomStatus(message) {
  roomStatus.textContent = message;
}

// Automatically open and join when a friend uses a room invite link.
const invitedRoom = new URLSearchParams(window.location.search).get('room');
if (invitedRoom) {
  roomPanel.hidden = false;
  document.getElementById('room-code-input').value = invitedRoom.toUpperCase();
  joinRoom(invitedRoom);
}