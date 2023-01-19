class DQNAgent {
  constructor(inputShape, nbActions) {
    this.model = this.buildModel(inputShape, nbActions)
    this.targetModel = this.buildModel(inputShape, nbActions)
    this.updateTargetModel()

    this.replayMemory = []
    this.replayMemoryMinSize = 100
    this.replayMemoryMaxSize = 1000

    this.targetUpdateCounter = 0
    this.targetUpdateFrequency = 100

    this.learningRate = 0.001
    this.batchSize = 128
    this.epsilon = 1
    this.epsilonDiscount = 0.9
    this.discountFactor = 0.95
  }

  buildModel(inputShape, nbActions) {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 256, activation: 'relu', inputShape: inputShape }),
        tf.layers.dense({ units: nbActions, activation: 'linear' })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(),
      loss: tf.losses.meanSquaredError,
      metrics: ['mse']
    })

    return model
  }

  buildModel2(inputShape, nbActions) {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({ inputShape: inputShape, filters: 16, kernelSize: 8, padding: 'same', activation: 'relu' }),
        tf.layers.conv2d({ filters: 32, kernelSize: 4, padding: 'same', activation: 'relu' }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 256, activation: 'relu' }),
        tf.layers.dense({ units: nbActions, activation: 'linear' })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(),
      loss: tf.losses.meanSquaredError,
      metrics: ['mse']
    })

    return model
  }

  updateTargetModel() {
    for (let i = 0; i < this.targetModel.layers.length; i++) {
      this.targetModel.layers[i].setWeights(this.model.layers[i].getWeights())
    }
  }

  // transition = [currentState, action, reward, newState, done]
  updateReplayMemory(transition) {
    if (this.replayMemory.length > this.replayMemoryMaxSize) throw new Error()
    if (this.replayMemory.length === this.replayMemoryMaxSize) this.replayMemory.shift()
    this.replayMemory.push(transition)
  }

  async trainStep(terminalState) {
    if (this.replayMemory.length < this.replayMemoryMinSize) return

    const X = []
    const y = []

    tf.tidy(() => {
      const batch = this.sampleReplayMemory(this.batchSize)
      const currentStatesTensor = tf.tensor(batch.map(transition => transition[0]))
      const newStatesTensor = tf.tensor(batch.map(transition => transition[3]))

      const currentQsList = this.model.predict(currentStatesTensor).arraySync()
      const newQsList = this.targetModel.predict(newStatesTensor).arraySync()


      let i = 0
      let targetQ
      for (const [currentState, action, reward, newState, done] of batch) {
        if (!done) {
          targetQ = reward + this.discountFactor * Math.max(...newQsList[i])
        } else {
          targetQ = reward
        }

        const currentQs = currentQsList[i]
        currentQs[action] = targetQ
        X.push(currentState)
        y.push(currentQs)
        i++
      }

    })

    const XTensor = tf.tensor(X)
    const yTensor = tf.tensor(y)
    await this.model.fit(XTensor, yTensor, { batchSize: this.batchSize }).then(info => {
      if (terminalState) console.log('loss:', info.history.loss)
      // console.log('memory:', tf.memory().numTensors)
      if (terminalState) this.targetUpdateCounter++
      if (this.targetUpdateCounter % this.targetUpdateFrequency === 0) this.updateTargetModel()
    })
    XTensor.dispose()
    yTensor.dispose()
  }

  sampleReplayMemory() {
    const shuffledReplayMemory = this.replayMemory.sort((a, b) => 0.5 - Math.random())
    return shuffledReplayMemory.slice(0, this.batchSize)
  }

  predictQs(givenState) {
    const predTensor = tf.tidy(() => {
      return this.model.predict((tf.expandDims(tf.tensor(givenState), 0)))
    })
    const pred = predTensor.arraySync()[0]
    predTensor.dispose()
    return pred
  }

  save() {
    this.model.save('downloads://mymodel')
  }

  async load() {
    this.model = await tf.loadLayersModel('./mymodel.json')
    this.targetModel = await tf.loadLayersModel('./mymodel.json')
    this.epsilon = 0
    console.log('===== Model successfully loaded ✔️ =====')
  }
}
