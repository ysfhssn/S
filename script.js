class Keys {
  static get UP() { return 1 }
  static get DOWN() { return -1 }
  static get RIGHT() { return 10 }
  static get LEFT() { return -10 }
}

function resetGame() {
  document.removeEventListener('keydown', keyPush)
  px = Math.floor(0.5 * COLS)
  py = Math.floor(0.5 * ROWS)
  gsx = Math.round(canv.width / COLS)
  gsy = Math.round(canv.height / ROWS)
  ax = Math.floor(0.6 * COLS)
  ay = Math.floor(0.6 * ROWS)
  xv = yv = 0
  trail = []
  tail = 5
  score.textContent = trail.length
  best.textContent = localStorage.getItem('best') || 0
  dir = null
  i = 0

  if (mode === 'SINGLE PLAYER 🎮') {
    canMove = true
    document.addEventListener('keydown', keyPush)
  }

  else if (mode === 'Q LEARNING 💪') {
    reward = 0
    prevPx = px
    prevPy = py
    curState = newState = getState()
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

function game() {
  // console.log(getState())
  prevPx = px
  prevPy = py

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canv.width, canv.height)

  ctx.fillStyle = 'red'
  ctx.fillRect(ax * gsx, ay * gsy, gsx - 2, gsy - 2)

  if (mode === 'HAMILTONIAN CYCLE ⚪') {
    px = path[i][0]
    py = path[i][1]
    i = (i + 1) % (ROWS * COLS)
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
      [yv, xv] = actions[qtable[curState].indexOf(Math.max(...qtable[curState]))]
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


  ctx.fillStyle = 'lime'
  for (let i = 0; i < trail.length; i++) {
    ctx.fillRect(trail[i].x * gsx, trail[i].y * gsy, gsx - 1, gsy - 1)

    if (mode === 'SINGLE PLAYER 🎮' && !dir) { return }

    if (trail[i].x == px && trail[i].y == py) {
      if (trail.length > 5 && trail.length > parseInt(best.textContent)) {
        best.textContent = trail.length
        localStorage.setItem('best', trail.length)
      }

      if (mode === 'Q LEARNING 💪') {
        reward = -10
        updateQtable() // updating Qtable before resetting the game

        if (episode % 100 === 0) {
          epsilon = epsilon * epsilonDiscount
          resetRangeDOMNodes()
          console.log('episode', episode, 'eps', epsilon)
          console.log('qtable', qtable)
          localStorage.setItem('qtable', JSON.stringify(qtable))
          localStorage.setItem('epsilon', epsilon)
          localStorage.setItem('episode', episode)
        }
        episode++
      }

      resetGame()
    }

    if (ax == px && ay == py) {
      if (mode === 'Q LEARNING 💪') {
        reward = 10
        console.log('reward', reward)
      }

      tail++
      score.textContent = tail
      ax = Math.floor(Math.random() * COLS)
      ay = Math.floor(Math.random() * ROWS)
    }
  }

  if (mode === 'Q LEARNING 💪') { updateQtable() }

  trail.push({ x: px, y: py })
  while (trail.length > tail) { trail.shift() }
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

const canv = document.getElementById('gc')
const ctx = canv.getContext('2d')
const score = document.getElementById('score')
const best = document.getElementById('best')
const fps = document.getElementById('fps')
const [ROWS, COLS] = [20, 20]

let interval = null,
    mode = 'SINGLE PLAYER 🎮',
    gameSpeed = 1000 / 15

fps.textContent = Math.round(1000/gameSpeed)
canv.width = 400
canv.height = 400
resetGame()


/**************************************************************************************
                                    HAMILTONIAN CYCLE
***************************************************************************************/
// src must be [line, column]
function findHamiltonianCycle(path, src) {
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
      if (i === j || i === -j) { continue }
      let vi = vY + i
      let vj = vX + j
      if (vi === -1) { vi = ROWS - 1 }
      else if (vi === ROWS) { vi = 0 }
      else if (vj === -1) { vj = COLS - 1 }
      else if (vj === COLS) { vj = 0 }
      if (!res.includes([vi, vj])) { res.push([vi, vj]) }
    }
  }
  return res
}

const path = []
const visited = new Array(ROWS).fill().map(() => new Array(COLS).fill(false))

visited[py][px] = true
path.push([py, px])
findHamiltonianCycle(path, [py, px])
// console.log(path)


/**************************************************************************************
                                    Q LEARNING
***************************************************************************************/
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

function updateQtable() {
  if (qtable[curState]) {
    qtable[curState][action] = (1-lr)*qtable[curState][action] + lr*(reward + dr*Math.max(...qtable[newState]))
  } else {
    qtable[curState] = [0, 0, 0, 0]
  }
}

/*    [0,1], [0,-1], [1,0], [-1,0]
s0
s1
s2
...
*/

const qtable = JSON.parse(localStorage.getItem('qtable')) || qt || {}
const actions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

let lr = 0.01,
    dr = 0.95,
    epsilon = parseFloat(localStorage.getItem('epsilon')) || 1,
    episode = parseInt(localStorage.getItem('episode')) || 1,
    epsilonDiscount = 0.99,
    prevPy = py,
    prevPx = px,
    curState = getState(),
    newState = curState,
    action = null, // 0 1 2 3
    reward = 0


/**************************************************************************************
                                    EVENT LISTENERS
***************************************************************************************/
function resetFps() {
  if (interval) { clearInterval(interval) }
  interval = setInterval(game, gameSpeed)
  fps.textContent = Math.round(1000/gameSpeed)
}

function resetRangeDOMNodes() {
  rangeInput.setAttribute('value', epsilon*100)
  rangeInfo.textContent = epsilon
}

const startBtns = document.querySelectorAll('.start-btn')
const rangeInput = document.querySelector('input[type=range]')
const rangeInfo = document.getElementById('range-info')

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
    interval = setInterval(game, gameSpeed)
  })
})

/* SPEED */
document.getElementById('increase-speed').addEventListener('click', (e) => {
  gameSpeed /= 2
  resetFps()
})

document.getElementById('decrease-speed').addEventListener('click', (e) => {
  gameSpeed *= 2
  resetFps()
})

rangeInput.addEventListener('input', (e) => {
  epsilon = parseInt(e.target.value) / 100
  resetRangeDOMNodes()
  resetGame()
})



resetRangeDOMNodes()
interval = setInterval(game, gameSpeed)