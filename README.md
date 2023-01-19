<p align="center"><img src="https://miro.medium.com/max/1400/0*Og_WAwmxCEqA-ehn.png" width="600"></p>

## [Epsilon-Greedy Q-learning](https://www.baeldung.com/cs/epsilon-greedy-q-learning)

```javascript
State = [
    isDirectionRight, isDirectionLeft, isDirectionDown, isDirectionUp,
    isAppleRight, isAppleLeft, isAppleDown, isAppleUp,
    isCollidingRight, isCollidingLeft, isCollidingDown, isCollidingUp
]

Action in [0, 1, 2, 3]
dY, dX = [[0, 1], [0, -1], [1, 0], [-1, 0]][Action] <--> dY, dX = [Right, Left, Down, Up][Action]

// Exploration
if random() < epsilon
    choose random action
// Exploitation
else
    choose action that maximizes Q[current_state][action]
```

* The more the AI trains, the more rewards we get (see console.log)
* The Q table and training infos are persisted in local storage

## [DQN](https://towardsdatascience.com/practical-guide-for-dqn-3b70b1d759bf)

<img src="https://miro.medium.com/max/720/1*uLtcNBImDEo1qcUaOK5niw.webp"><br>
<img src="https://opendilab.github.io/DI-engine/_images/DQN.png" width="600">

## [Hamiltonian Path with DFS](https://www.hackerearth.com/practice/algorithms/graphs/hamiltonian-path/tutorial/)

<img src="./dfs.png" width="400">
