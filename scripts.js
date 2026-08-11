if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js')
window.copyright.innerText = `AlexSt © ${new Date().getFullYear()} Alias Game`

const SECONDS = 59
const WINRATE = 60

const teamNames = [
  "Динаміка", "Блискавка", "Орли", "Титани", "Леви", "Ведмеді", "Соколи", "Кобри", "Штурмовики", "Дракони",
  "Фенікси", "Гладіатори", "Яструби", "Молоти", "Зірки", "Пантера", "Ракети", "Громові", "Вікінги", "Самураї",
  "Вовки", "Зубри", "Кречети", "Вершники", "Рейнджери", "Легенди", "Соколи", "Орбіта", "Комета", "Торнадо",
  "Ліга", "Борці", "Стрільці", "Фурія", "Карателі", "Кіборги", "Атоми", "Валкірії", "Ведмежата", "Кречети",
  "Ягуари", "Патріоти", "Завойовники", "Супутники", "Пірати", "Акули", "Тигри", "Леви", "Грифони", "Чорти",
  "Рицарі", "Армія", "Інквізитори", "Деспоти", "Хижаки", "Соколи", "Ворони", "Альянс", "Флот", "Сталевари",
  "Буревій", "Привиди", "Чемпіони", "Еліта", "Прометей", "Легіон", "Титани", "Герої", "Варвари", "Генерали",
  "Циклони", "Трибуна", "Чемпіони", "Орли", "Бунтівники", "Трибуна", "Метеори", "Сила", "Арена", "Рейнджери",
  "Фурія", "Мрія", "Перемога", "Зірка", "Кристал", "Промінь", "Світло", "Магніт", "Галактика", "Альфа",
  "Бета", "Гамма", "Омега", "Пульсар", "Парадокс", "Атлант", "Сталкер", "Сингулярність", "Нова", "Супернова"
]

let words = []

async function loadWords() {
  await dbSeedWords();
  const all = await dbGetAllWords();
  words = all.map(w => w.word);
}

function getRandomTeamName() {
  const randomIndex = Math.floor(Math.random() * teamNames.length)
  const team = [...teamNames].splice(randomIndex, 1)[0]
  return team
}

function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * words.length)
  const word = words.splice(randomIndex, 1)[0]
  return word
}

function onLaunch() {
  loadWords().then(() => {
    const team1 = localStorage.getItem('team1')
    const team2 = localStorage.getItem('team2')
    const saved = Boolean(team1 && team2)
    document.body.dataset.saved = saved
    if (saved) {
      window.team1Name.value = team1
      window.team2Name.value = team2
      const score1 = parseInt(localStorage.getItem(`${team1}_score`)) || 0
      const score2 = parseInt(localStorage.getItem(`${team2}_score`)) || 0
      window.team1Score.innerText = score1
      window.team2Score.innerText = score2
      // a decided game is derived from the score rather than a stored flag, so
      // it survives a reload: there is nothing left to continue
      if (isDecided(score1, score2)) markFinished()
    } else {
      setRandomNames()
    }
    syncStartButton()
  })
}

// the round is over for both teams once either has reached the target
function isDecided(score1, score2) {
  return score1 >= WINRATE || score2 >= WINRATE
}

function markFinished() {
  document.body.dataset.saved = 'false'
  document.body.dataset.finished = 'true'
}

function setRandomNames() {
  // a game in progress owns its team names; shuffling them would orphan the
  // scores stored against the old names
  if (document.body.dataset.saved === 'true') return
  window.team1Name.value = getRandomTeamName()
  window.team2Name.value = getRandomTeamName()
}

// both screens are on one snap track, so moving between them is a scroll
function showScreen(id) {
  window.screenTrack.scrollTo({
    left: id === 'gameScreen' ? window.screenTrack.clientWidth : 0,
    behavior: 'smooth'
  })
}

function continueGame() {
  showScreen('gameScreen')
  beforeBegin()
}

function startGame() {
  // with a game in progress the button resets it and stays here, so the user
  // lands on a clean start screen and chooses when to actually begin
  if (document.body.dataset.saved === 'true') {
    resetGame()
    return
  }
  newGame()
}

function resetGame() {
  localStorage.clear()
  document.body.dataset.saved = 'false'
  document.body.dataset.finished = 'false'
  window.activeTeam = undefined
  window.started = false
  window.paused = false
  window.team1Score.innerText = ''
  window.team2Score.innerText = ''
  setRandomNames()
  syncStartButton()
}

function syncStartButton() {
  const saved = document.body.dataset.saved === 'true'
  const finished = document.body.dataset.finished === 'true'
  window.startBtn.innerText = saved || finished ? 'Почати нову гру' : 'Почати!'
}

function newGame() {
  localStorage.clear()

  if (window.team1Name.value && window.team2Name.value) {
    localStorage.setItem('team1', window.team1Name.value)
    localStorage.setItem('team2', window.team2Name.value)
    document.body.dataset.saved = 'true'
    window.activeTeam = undefined
    window.started = false
    showScreen('gameScreen')
    beforeBegin()
  }
}

async function beforeBegin() {
  if (words.length === 0) await loadWords()
  if (window.activeTeam === undefined) window.activeTeam = localStorage.getItem('team1')
  window.teamName.innerText = window.activeTeam || localStorage.getItem('team1')
  window.teamScore.innerText = ` (${localStorage.getItem(`${window.activeTeam}_score`) || 0})`
  showTurnButtons(window.started)
}

// skip and next belong to an active turn; the round-control button owns the row
// the rest of the time
// a turn shows skip / pause / next; between turns the control button owns the
// row. while paused only the pause button stays, now reading as "resume"
function showTurnButtons(show) {
  // the turn row and the control button occupy the same grid cell, so only one
  // of the two is ever shown; display still drives layout, the class the fade
  const turnRow = show || window.paused
  setHidden(window.turnActions, !turnRow, 'flex')
  setHidden(window.beginContinuedbtn, turnRow, 'flex')
  // while paused only the pause button remains, now reading as "resume"
  setHidden(window.skipWordbtn, !show, 'grid')
  setHidden(window.nextWordbtn, !show, 'grid')
  setHidden(window.pauseBtn, !turnRow, 'grid')
}

// fades an element out before pulling it from the row, and puts it back in the
// row a frame before fading in, so both directions have something to animate
const FADE_MS = 280

function setHidden(el, hidden, display) {
  clearTimeout(el.fadeTimer)
  if (hidden) {
    if (el.style.display === 'none') return
    el.classList.add('is-hidden')
    el.fadeTimer = setTimeout(() => { el.style.display = 'none' }, FADE_MS)
    return
  }
  el.style.display = display
  requestAnimationFrame(() => el.classList.remove('is-hidden'))
}

function setResumeMode(resuming) {
  window.pauseBtn.classList.toggle('is-paused', resuming)
  window.pauseBtn.setAttribute('aria-label', resuming ? 'Продовжити' : 'Пауза')
}

function togglePause() { window.paused ? beginGame() : pauseGame() }

let timerFn

async function beginGame() {
  if (words.length === 0) await loadWords()
  setResumeMode(false)
  window.timer.classList.remove('is-hidden')
  window.seconds = localStorage.getItem('secondsLeft') || SECONDS
  timerFn = setInterval(() => tick(), 1000)
  window.word.classList.remove('is-hidden')
  if (!window.started && !window.paused) {
    window.word.innerText = getRandomWord()
  }
  if (window.started && window.seconds <= 0) onTurnEnd()
  window.started = true
  // cleared only after the word check above, which distinguishes a resumed turn
  // from a fresh one; the button row is re-synced now that the flag is right
  window.paused = false
  showTurnButtons(true)
}

function nextWord() {
  window.word.innerText = getRandomWord()
  const score = localStorage.getItem(`${window.activeTeam}_score`) || 0
  localStorage.setItem(`${window.activeTeam}_score`, parseInt(score) + 1)
  window.teamScore.innerText = ` (${localStorage.getItem(`${window.activeTeam}_score`)})`
  if (!window.started) onTurnEnd()
}

// a skipped word costs the turn nothing, so the score is left alone
function skipWord() {
  window.word.innerText = getRandomWord()
  if (!window.started) onTurnEnd()
}

function pauseGame() {
  window.started = false
  window.paused = true
  // the word is hidden so nobody keeps guessing while the clock is stopped
  window.word.classList.add('is-hidden')
  showTurnButtons(false)
  setResumeMode(true)
  localStorage.setItem('secondsLeft', window.seconds)
  clearInterval(timerFn)
}

function tick() {
  window.timer.innerText = window.seconds
  if (window.seconds <= 0) {
    clearInterval(timerFn)
    onSecondsEnd()
  } else {
    window.seconds--
  }
}

function onSecondsEnd() {
  localStorage.removeItem('secondsLeft')
  window.started = false
  window.seconds = SECONDS
}

function onTurnEnd() {
  changeActiveTeam()
  if (checkForVictory()) return
  window.paused = false
  setResumeMode(false)
  window.beginContinuedbtn.innerText = 'Почати'
  window.word.classList.add('is-hidden')
  window.timer.classList.add('is-hidden')
  beforeBegin()
}

function changeActiveTeam() {
  window.endRound = false
  if (window.activeTeam === localStorage.getItem('team1')) {
    window.activeTeam = localStorage.getItem('team2')
  } else {
    window.activeTeam = localStorage.getItem('team1')
    window.endRound = true
  }
}

function checkForVictory() {
  const team1 = localStorage.getItem('team1')
  const team2 = localStorage.getItem('team2')
  const team1score = parseInt(localStorage.getItem(`${team1}_score`))
  const team2score = parseInt(localStorage.getItem(`${team2}_score`))
  if (isDecided(team1score, team2score) && window.endRound) {
    // the round is over for good: only a new game follows, so the saved state
    // goes now and the home screen offers no "continue"
    const team1Won = team1score >= team2score
    window.teamWinnerName.innerText = team1Won ? team1 : team2
    window.teamWinnerScore.innerText = `(${team1Won ? team1score : team2score})`
    window.teamLoserName.innerText = team1Won ? team2 : team1
    window.teamLoserScore.innerText = `(${team1Won ? team2score : team1score})`
    // showModal puts the dialog in the top layer: centred, with a backdrop.
    // setting .open alone leaves it inline and unpositioned
    window.results.showModal()
    return true
  }
}

// the game screen is reused rather than reloaded, so its state is reset here
function gameOver() {
  clearInterval(timerFn)
  const team1 = localStorage.getItem('team1')
  const team2 = localStorage.getItem('team2')
  const finalScores = [
    localStorage.getItem(`${team1}_score`) || 0,
    localStorage.getItem(`${team2}_score`) || 0
  ]

  resetGame()

  // the game is over, so there is nothing to continue — but the final score
  // stays on screen until a new game replaces it
  window.team1Name.value = team1
  window.team2Name.value = team2
  window.team1Score.innerText = finalScores[0]
  window.team2Score.innerText = finalScores[1]
  markFinished()
  syncStartButton()

  window.word.innerText = ''
  window.timer.innerText = ''
  window.teamScore.innerText = ''
  window.teamName.innerText = ''
  window.beginContinuedbtn.innerText = 'Почати!'
  setResumeMode(false)
  showTurnButtons(false)
  showScreen('homeScreen')
}
