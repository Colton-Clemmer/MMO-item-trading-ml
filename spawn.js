var jsonFile = require('jsonfile')
var neuralNetLib = require('neuralnet')
var _ = require('lodash')
var uuid = require('uuid')

var config = {
    inputs: 10,
    outputs: 3
}

// Reward net for higher profit and sooner turn around
/*
    Output:
    Time to wait
*/

var input = _.map(jsonFile.readFileSync('./input.json').input, (d) => d[1])
var testInput = input.slice(input.length / 2, input.length)
// input = input.slice(0, input.length / 2)

var generateNeural = (net = null, data = input, train = true, numJ = 3, numK = 3) => {
    var netStartTime = new Date()
    var neuralNet
    if (net) {
        neuralNet = net.clone()
    } else {
        neuralNet = neuralNetLib(config)
    }

    var averageProfits = []
    var oldAverage = 0
    var timeSinceNewHighAverage = 0
    var reset = false
    _.times(numJ, (j) => {
        var highestProfit = 0
        var profits = []
        var t1Neural = neuralNet.clone()
        var startTime = new Date()
        var skippedDaysSet = []
        _.times(numK, (k) => {
            if (reset) {
                return
            }
            var tempNeural = t1Neural.clone()
            var inventoryAmount = 0
            var profit = 0
            var lastProfit = 0
            var averageBoughtPrice = 0
            var boughtPrices = []
            var numTimesBought = 0
            var soldPrices = []
            var numTimesSold = 0
            var daysSinceAction = 0
            var skippedDays = 0
            var startTestTime = new Date()
            for (var i = 0; i < data.length; i++) {
                if (reset) {
                    return
                }
                var inputArray = data.slice(i, i + 10)
                // inputArray.unshift(averageBoughtPrice)
                // inputArray.unshift(inventoryAmount)
                // inputArray.unshift(daysSinceAction)
                var currentAmount = data[i + 9]
                var test = (addDay = true) => {
                    var timeTaken = Math.abs(new Date() - startTime)
                    if (timeTaken > 300) {
                        console.log('Taking too long. Resetting')
                        reset = true
                        return false
                    }

                    var answer = tempNeural.predict(inputArray)
                    var actionTaken = false
                    if ((answer[0] > .1 && data[i + 10] > currentAmount) || (numTimesSold - numTimesBought) > 3) { // Buy
                        boughtPrices.push(currentAmount)
                        averageBoughtPrice = _.mean(boughtPrices)
                        inventoryAmount++
                        numTimesBought++
                        daysSinceAction = 0
                    }
                    if (!actionTaken && ((answer[1] > .1 && data[i + 10] < currentAmount) || (numTimesBought - numTimesSold) > 3) && inventoryAmount > 0 && currentAmount != averageBoughtPrice) { // Sell
                        profit += currentAmount - averageBoughtPrice
                        lastProfit = profit
                        
                        inventoryAmount--
                        boughtPrices.pop()
                        soldPrices.push(currentAmount)
                        daysSinceAction = 0
                    }
                    if (answer[0] < .1 && answer[1] < .1 && addDay) {
                        daysSinceAction++
                        skippedDays++
                    }
                    return true
                }
                test()
                if (daysSinceAction > 30) {
                    daysSinceAction = 30
                }
                for (var h = 0; h < daysSinceAction;h++) {
                    daysSinceAction--;
                    if (!test(false)) {
                        break
                    }
                }
            }
            skippedDaysSet.push(skippedDays)
            if (reset) {
                return
            }
            var startIndex = Math.random() * (input.length - 10)
            var sampleInput = data.slice(startIndex, startIndex + 10)
            // sampleInput.unshift(averageBoughtPrice)
            // sampleInput.unshift(inventoryAmount)
            if (train) {
                _.times(1, () => tempNeural.train(sampleInput, [Math.random(), Math.random(), Math.random()]))
            }
            
            profits.push(profit)
            if (profit > _.mean(profits)) {
                t1Neural = tempNeural.clone()
                highestProfit = profit
            }
        })
        if (reset) {
            return
        }
        var timeTaken = Math.abs(new Date() - startTime)
        // console.log(timeTaken + 'ms')
        console.log(' t1: ' + j + ' Profit: ' + Math.floor(_.mean(profits)) + (timeTaken > 300 ? ' [' + timeTaken + 'ms]' : '') +  (_.mean(skippedDaysSet) > 10 ? (' Skipped:' + _.mean(skippedDaysSet)) : ''))
        averageProfits.push(_.mean(profits))
        var averageProfit = Math.floor(_.mean(averageProfits))
        if (averageProfit > oldAverage) {
            neuralNet = t1Neural.clone()
            mostHighestProfit = highestProfit
            timeSinceNewHighAverage = 0
        } else {
            timeSinceNewHighAverage++
        }
        oldAverage = averageProfit
        
        if (timeSinceNewHighAverage > 10) {
            neuralNet = neuralNetLib(config)
            timeSinceNewHighAverage = 0
        }
    })

    console.log('Average: ' + oldAverage)
    console.log(Math.abs(netStartTime - new Date()) + 'ms\n\n')
    return [neuralNet.clone(), oldAverage]
}

var generateGenerations = (originNet, gens = 1, reps = 3, bestAverage = 0) => {
    if (gens === 1) {
        return [originNet, bestAverage]
    }
    console.log('Generation: ' + gens)
    var bestNet = _.maxBy(_.times(reps, () => generateNeural(originNet, input, true, 6, 6)), (n) => n[1])
    return generateGenerations(bestNet[0], gens - 1, reps, bestNet[1])
}

var getResult = () => {
    // var bestNet = _.maxBy(_.times(3, (j) => 
    //     generateNeural(_.maxBy(_.times(3, (k) => {
    //         console.log('J: ' + j + ' K: ' + k)
    //         return generateNeural()
    //     }), (n) => n[1])[0])), (n) => n[1])
    var bestNet = generateGenerations(neuralNetLib(config), 5, 6)
    console.log("\n\nBest Average: " + bestNet[1])
    var result = _.times(3, () => bestNet[0].predict(input.slice(input.length - 10, input.length)))
    var buyResult = _.meanBy(result, (r) => r[0])
    var sellResult = _.meanBy(result, (r) => r[1])
    var unsureResult = _.meanBy(result, (r) => r[2])
    return [buyResult, sellResult, unsureResult]
}
var id = uuid.v4()
var newResult = getResult()
var output = { results: newResult }
jsonFile.writeFileSync('./output-' + id + '.json', output)