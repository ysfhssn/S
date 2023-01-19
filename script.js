'use strict';

/* GAME VARIABLES */
const canv = document.getElementById('gc')
const ctx = canv.getContext('2d')
const score = document.getElementById('score')
const best = document.getElementById('best')
const fps = document.getElementById('fps')
const startBtns = document.querySelectorAll('.start-btn')
const rangeInput = document.querySelector('input[type=range]')
const rangeInfo = document.getElementById('range-info')

const [ROWS, COLS] = [20, 20]
const SIZE_X = Math.round(canv.width / COLS)
const SIZE_Y = Math.round(canv.height / ROWS)
// const obstacles = []
// for (let i = 0; i < ROWS; i++) {
//   obstacles.push({ x: 0, y: i})
//   obstacles.push({ x: COLS-1, y: i})
// }
// for (let i = 0; i < COLS; i++) {
//   obstacles.push({ x: i, y: 0})
//   obstacles.push({ x: i, y: ROWS-1})
// }

let interval = null,
    mode = 'SINGLE PLAYER 🎮',
    mspf = 1000 / 15

let px, py,
    xv, yv,
    ax, ay,
    dir,
    trail, tail,
    pathIndex,
    canMove

/* Q LEARNING VARIABLES */
const qtable = qt // {}
const ACTION_SPACE = [[0, 1], [0, -1], [1, 0], [-1, 0]]

const LR = 0.01
const DR = 0.95
const EPSILON_DISCOUNT = 0.99

let epsilon = Object.keys(qtable).length === 0 ? 1 : 0,
    episode = 1,
    prevPy,
    prevPx,
    curState,
    newState,
    action, // 0 1 2 3
    reward = 0

/* DQN Agent */
const agent = new DQNAgent([12], ACTION_SPACE.length)
// const agent = new DQNAgent([ROWS, COLS, 1], ACTION_SPACE.length)
agent.load()

/* HAMILTONIAN CYCLE VARIABLES */
const path = []
const visited = new Array(ROWS).fill().map(() => new Array(COLS).fill(false))

/* GAME FUNCTIONS */
class Keys {
  static get UP() { return 1 }
  static get DOWN() { return -1 }
  static get RIGHT() { return 10 }
  static get LEFT() { return -10 }
}

function resetGame() {
  score.textContent = 0
  best.textContent = localStorage.getItem('best') || 0
  fps.textContent = Math.round(1000/mspf)
  document.removeEventListener('keydown', keyPush)

  px = Math.floor(0.5 * COLS)
  py = Math.floor(0.5 * ROWS)
  spawnApple()
  xv = yv = 0
  trail = []
  tail = 5
  dir = null
  pathIndex = 0

  if (mode === 'SINGLE PLAYER 🎮') {
    canMove = true
    document.addEventListener('keydown', keyPush)
  }

  else if (mode === 'Q LEARNING 💪' || mode === 'DQN 🧠') {
    resetRangeDOMNodes()
    reward = 0
    prevPx = px
    prevPy = py
    if (mode === 'DQN 🧠') curState = newState = JSON.parse(getState())
    else curState = newState = getState()
  }
}

function moveSnakeByOffset() {
  px += xv
  py += yv
  if (px < 0) { px = COLS - 1 }
  if (px > COLS - 1) { px = 0 }
  if (py < 0) { py = ROWS - 1 }
  if (py > ROWS - 1) { py = 0 }
}

function spawnApple() {
  ax = Math.floor(Math.random() * COLS)
  ay = Math.floor(Math.random() * ROWS)
  // while (obstacles.find(o => o.x === ax && o.y === ay)) {
  //   ax = Math.floor(Math.random() * COLS)
  //   ay = Math.floor(Math.random() * ROWS)
  // }
}

async function game() {
  // console.log(getState())
  prevPx = px
  prevPy = py

  trail.push({ x: px, y: py })
  while (trail.length > tail) { trail.shift() }

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canv.width, canv.height)

  ctx.fillStyle = 'red'
  ctx.fillRect(ax * SIZE_X, ay * SIZE_Y, SIZE_X - 2, SIZE_Y - 2)

  // ctx.fillStyle = 'grey'
  // for (let i = 0; i < obstacles.length; i++) {
  //   ctx.fillRect(obstacles[i].x * SIZE_X, obstacles[i].y * SIZE_Y, SIZE_X - 1, SIZE_Y - 1)
  // }

  if (mode === 'HAMILTONIAN CYCLE ⚪') {
    px = path[pathIndex][0]
    py = path[pathIndex][1]
  }

  else if (mode === 'SINGLE PLAYER 🎮') {
    moveSnakeByOffset()
    canMove = true
  }

  else if (mode === 'Q LEARNING 💪') {
    reward = 0

    curState = newState
    // console.log('curState', curState)
    if (!qtable[curState]) { qtable[curState] = [0, 0, 0, 0] }

    if (Math.random() < epsilon || qtable[curState].every(x => x === 0)) {
      [py, px] = neighbors([py, px])[Math.floor(Math.random() * neighbors([py, px]).length)]
    } else {
      [yv, xv] = ACTION_SPACE[qtable[curState].indexOf(Math.max(...qtable[curState]))]
      moveSnakeByOffset()
    }

    newState = getState()
    // console.log('newState', newState)
    if (!qtable[newState]) { qtable[newState] = [0, 0, 0, 0] }

    if (px - prevPx > 0) { action = 0 }
    else if (px - prevPx < 0) { action = 1 }
    else if (py - prevPy > 0) { action = 2 }
    else { action = 3 }
  }

  else if (mode === 'DQN 🧠') {
    reward = 0

    curState = newState

    if (Math.random() < agent.epsilon) {
      [py, px] = neighbors([py, px])[Math.floor(Math.random() * neighbors([py, px]).length)]
    } else {
      [yv, xv] = ACTION_SPACE[agent.predictQs(curState).indexOf(Math.max(...agent.predictQs(curState)))]
      moveSnakeByOffset()
    }

    newState = JSON.parse(getState())

    if (px - prevPx > 0) { action = 0 }
    else if (px - prevPx < 0) { action = 1 }
    else if (py - prevPy > 0) { action = 2 }
    else { action = 3 }
  }

  ctx.fillStyle = 'lime'
  for (let i = 0; i < trail.length; i++) {
    ctx.fillRect(trail[i].x * SIZE_X, trail[i].y * SIZE_Y, SIZE_X - 1, SIZE_Y - 1)

    if (mode === 'HAMILTONIAN CYCLE ⚪' && pathIndex === 0) break
    if (mode === 'SINGLE PLAYER 🎮' && !dir) break

    if ((trail[i].x === px && trail[i].y === py) /*|| obstacles.find(o => o.x === px - xv && o.y === py - yv)*/) {
      if (trail.length > 5 && trail.length > parseInt(best.textContent)) {
        best.textContent = trail.length
        localStorage.setItem('best', trail.length)
      }

      if (mode === 'Q LEARNING 💪') {
        reward = -100
        updateQtable() // updating Qtable before resetting the game

        if (episode % 100 === 0) {
          epsilon = epsilon * EPSILON_DISCOUNT
          resetRangeDOMNodes()
          console.log('episode', episode, 'eps', epsilon)
          console.log('qtable', qtable)
        }
        episode++
      }

      else if (mode === 'DQN 🧠') {
        reward = -100

        if (agent.epsilon > 0.1) {
          const transition = [curState, action, reward, newState, true]
          agent.updateReplayMemory(transition)
          await agent.trainStep(true)

          if (episode % 100 === 0) {
            agent.epsilon *= agent.epsilonDiscount
            console.log('episode', episode, 'eps', agent.epsilon)
          }
        }

        episode++
      }

      resetGame()
      return
    }

    if (ax == px && ay == py) {
      if (mode === 'Q LEARNING 💪') {
        reward = 10
        console.log('reward', reward)
      }

      else if (mode === 'DQN 🧠') {
        reward = 10
        console.log('reward', reward)
      }

      tail++
      score.textContent = tail
      spawnApple()
    }
  }

  if (mode === 'HAMILTONIAN CYCLE ⚪') pathIndex = (pathIndex + 1) % (ROWS * COLS)
  else if (mode === 'Q LEARNING 💪') updateQtable()
  else if (mode === 'DQN 🧠' && agent.epsilon > 0.1) {
    const transition = [curState, action, reward, newState, false]
    agent.updateReplayMemory(transition)
    await agent.trainStep(false)
  }
}

function keyPush(evt) {
  if (!canMove) { return }
  canMove = false
  let dirCode
  switch (evt.keyCode) {
    case 37: dirCode = Keys.LEFT ; break
    case 38: dirCode = Keys.UP ; break
    case 39: dirCode = Keys.RIGHT ; break
    case 40: dirCode = Keys.DOWN ; break
  }
  if (dir === -dirCode) { return }
  dir = dirCode
  if (dir === Keys.LEFT) { xv = -1 ; yv = 0 }
  else if (dir === Keys.UP) { xv = 0 ; yv = -1 }
  else if (dir === Keys.RIGHT) { xv = 1 ; yv = 0 }
  else if (dir === Keys.DOWN) { xv = 0 ; yv = 1 }
  // console.log({ [Keys.RIGHT]: 'R', [Keys.LEFT]: 'L', [Keys.DOWN]: 'D', [Keys.UP]: 'U' }[dir])
}

function resetFps() {
  if (interval) { clearInterval(interval) }
  interval = setInterval(game, mspf)
  fps.textContent = Math.round(1000/mspf)
}

function resetRangeDOMNodes() {
  const rangeValue = mode === 'DQN 🧠' ? agent.epsilon : epsilon
  rangeInput.setAttribute('value', rangeValue*100)
  rangeInfo.textContent = rangeValue.toFixed(5)
}

/* HAMILTONIAN CYCLE FUNCTIONS */
function findHamiltonianCycle(path, src) { // src must be [line, column]
  if (path.length === ROWS * COLS) { return true }
  for (let neighbor of neighbors(src)) {
    let [i, j] = neighbor
    if (!visited[i][j]) {
      visited[i][j] = true
      path.push(neighbor)
      if (findHamiltonianCycle(path, neighbor)) { return true }
      visited[i][j] = false
      path.pop()
    }
  }
  return false
}

function neighbors(v) {
  const [vY, vX] = v
  const res = []
  for (let i of [-1, 0, 1]) {
    for (let j of [-1, 0, 1]) {
      if (i === j || i === -j) continue
      let vi = vY + i
      let vj = vX + j
      if (vi === -1) vi = ROWS - 1
      else if (vi === ROWS) vi = 0
      else if (vj === -1) vj = COLS - 1
      else if (vj === COLS) vj = 0
      // if (trail.find(t => t.x === vj && t.y === vi) /*|| obstacles.find(o => o.x === vj && o.y === vi)*/) continue
      res.push([vi, vj])
    }
  }
  return res
}

/* Q LEARNING FUNCTIONS */
function getState() {
  let [dirR, dirL, dirD, dirU] = [0, 0, 0, 0]
  if (px === 0 && prevPx === COLS-1) { dirR = 1 }
  else if (px === COLS-1 && prevPx === 0) { dirL = 1 }
  else if (px - prevPx > 0) { dirR = 1 }
  else if (px - prevPx < 0) { dirL = 1 }
  else if (py === 0 && prevPy === ROWS-1) { dirD = 1 }
  else if (py === ROWS-1 && prevPy === 0) { dirU = 1 }
  else if (py - prevPy > 0) { dirD = 1 }
  else if (py - prevPy < 0) { dirU = 1 }

  return JSON.stringify([
    dirR,
    dirL,
    dirD,
    dirU,
    ax - px > 0 ? 1 : 0,
    ax - px < 0 ? 1 : 0,
    ay - py > 0 ? 1 : 0,
    ay - py < 0 ? 1 : 0,
    !dirL && trail.find(t => JSON.stringify({ x: (px+1)%COLS, y: py }) === JSON.stringify(t)) ? 1 : 0,
    !dirR && trail.find(t => JSON.stringify({ x: (px-1)%COLS, y: py }) === JSON.stringify(t)) ? 1 : 0,
    !dirU && trail.find(t => JSON.stringify({ x: px, y: (py+1)%COLS }) === JSON.stringify(t)) ? 1 : 0,
    !dirD && trail.find(t => JSON.stringify({ x: px, y: (py-1)%COLS }) === JSON.stringify(t)) ? 1 : 0
  ])
}

function getFullState() {
  const state = Array(ROWS).fill().map(() => Array(COLS).fill(0));
  for (const {x, y} of trail) {
    state[y][x] = 1
  }
  state[py][px] = 2
  state[ay][ax] = 3
  return state
}

function updateQtable() {
  qtable[curState][action] = (1-LR)*qtable[curState][action] + LR*(reward + DR*Math.max(...qtable[newState]))
}

(function main() {
  resetGame()

  /* HAMILTONIAN CYCLE */
  visited[py][px] = true
  path.push([py, px])
  findHamiltonianCycle(path, [py, px])
  // console.log(path)

  /* MODE */
  startBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      mode = e.target.textContent

      if (trail.length > 5 && trail.length > parseInt(best.textContent)) {
        best.textContent = trail.length
        localStorage.setItem('best', trail.length)
      }

      resetGame()
      if (interval) { clearInterval(interval) }
      interval = setInterval(game, mspf)
    })
  })

  /* SPEED */
  document.getElementById('increase-speed').addEventListener('click', (e) => {
    mspf /= 2
    resetFps()
  })

  document.getElementById('decrease-speed').addEventListener('click', (e) => {
    mspf *= 2
    resetFps()
  })

  rangeInput.addEventListener('input', (e) => {
    epsilon = parseInt(e.target.value) / 100
    resetGame()
  })

  interval = setInterval(game, mspf)
})()
