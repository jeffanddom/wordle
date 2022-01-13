import * as fs from 'fs'
import * as readline from 'readline'

function letters(s: string): string[] {
  return s.split("")
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter(x => b.has(x)))
}

function subtract(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter(x => !b.has(x)))
}

function bestGuess(words: Set<string>): string {
  const scores: Array<[string, number, number]> = []
  for (var w of words) {
    var inexactScore = 0
    var exactScore = 0

    for (var p = 0; p < 5; p++) {
      for (var other of words) {
        if (other.indexOf(w[p]) < 0) {
          continue
        }

        inexactScore += 1

        if (other[p] == w[p]) {
          exactScore += 1
        }
      }
    }

    scores.push([w, inexactScore, exactScore])
  }

  var sorted = scores.sort((a, b) => {
    const scoreA = a[1] + 3 * a[2]
    const scoreB = b[1] + 3 * b[2]
    return scoreB - scoreA
  })

  console.log(sorted)

  return sorted[0][0]
}

class InputReader {
  lines: string[]
  waiting: Array<(s: string) => void>

  constructor() {
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.lines = []
    this.waiting = []

    rl.on('line', (line: string) => {
      if (this.waiting.length > 0) {
        var resolve = this.waiting.shift()!
        resolve(line)
        return
      }
      
      this.lines.push(line)
    })
  }

  async getLine(): Promise<string> {
    if (this.lines.length > 0) {
      return this.lines.shift()!
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }  
}

const reader = new InputReader()

async function main(): Promise<void> {
  const words: Set<string> = new Set(JSON.parse(fs.readFileSync('./words.json').toString()))

  const wordsContainingLetter: Record<string, Set<string>> = {}
  const aCode = 97
  for (var i = 0; i < 26; i++) {
    const c = String.fromCharCode(aCode + i);
    wordsContainingLetter[c] = new Set()
    for (var w of words) {
      var ls = letters(w);
      if (ls.indexOf(c) < 0) {
        continue
      }
      wordsContainingLetter[c].add(w)
    }
  }

  const wordsByPosByLetter: Array<Record<string, Set<string>>> = []
  for (var p = 0; p < 5; p++) {
    wordsByPosByLetter[p] = {}
    for (var w of words) {
      wordsByPosByLetter[p][w[p]] ??= new Set()
      wordsByPosByLetter[p][w[p]].add(w)
    }
  }

  var guess = "arose"

  var candidates = words
  while (true) {
    console.log(`Guess: ${guess}`)
    const input = await reader.getLine()
    for (var i = 0; i < 5; i++) {
      switch (input[i]) {
        case "g": // green
          candidates = intersect(candidates, wordsByPosByLetter[i][guess[i]])
          break

        case "y": // yellow
          candidates = intersect(candidates, wordsContainingLetter[guess[i]])
          candidates = subtract(candidates, wordsByPosByLetter[i][guess[i]])
          break

        default: // miss
          candidates = subtract(candidates, wordsContainingLetter[guess[i]])
          break
      }
    }

    console.log("remaining candidates")
    console.log(candidates)

    guess = bestGuess(candidates)
    console.log(guess)
  }
}

main().catch(err => {
  console.log(err)
  process.exit(1)
})