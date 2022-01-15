import * as fs from 'fs'
import * as readline from 'readline'

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter(x => b.has(x)))
}

function subtract(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter(x => !b.has(x)))
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

class Dictionary {
  private words: Set<string>
  private wordsContainingLetter: Record<string, Set<string>>
  private wordsContainingLetterAtLeastNTimes: Record<string, Array<Set<string>>>
  private wordsByPosByLetter: Array<Record<string, Set<string>>>

  constructor(words: Set<string>) {
    this.words = words
    this.wordsContainingLetter = {}
    this.wordsContainingLetterAtLeastNTimes = {}
    this.wordsByPosByLetter = []

    const aCode = 97
    for (var i = 0; i < 26; i++) {
      const c = String.fromCharCode(aCode + i);
      this.wordsContainingLetter[c] = new Set()
      this.wordsContainingLetterAtLeastNTimes[c] = [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
        new Set(),
      ]

      for (var w of words) {
        const letters = w.split("");
        const instances = letters.filter(letter => letter == c).length
        if (instances === 0) {
          continue
        }

        this.wordsContainingLetter[c].add(w)

        for (var j = 1; j <= instances; j++) {
          this.wordsContainingLetterAtLeastNTimes[c][j].add(w)
        }
      }
    }
    
    for (var p = 0; p < 5; p++) {
      this.wordsByPosByLetter[p] = {}
      for (var w of words) {
        this.wordsByPosByLetter[p][w[p]] ??= new Set()
        this.wordsByPosByLetter[p][w[p]].add(w)
      }
    }    
  }

  getWordsContainingLetter(letter: string): Set<string> {
    return this.wordsContainingLetter[letter]
  }

  getWordsContainingLetterAtLeastNTimes(letter: string, count: number): Set<string> {
    return this.wordsContainingLetterAtLeastNTimes[letter][count]
  }

  getWordsByPosByLetter(pos: number, letter: string): Set<string> {
    return this.wordsByPosByLetter[pos][letter]
  }

  bestGuess(): string {
    const scores: Array<[string, number, number]> = []
    for (var w of this.words) {
      var inexactScore = 0
      var exactScore = 0
  
      for (var p = 0; p < 5; p++) {
        // Only credit the inexact score if this is the first time we have done
        // so for this letter. Otherwise, we incorrectly give advantage to words
        // with double-letters.          
        if (w.indexOf(w[p]) === p) {
          inexactScore += this.wordsContainingLetter[w[p]].size
        }

        exactScore += this.wordsByPosByLetter[p][w[p]].size
      }
  
      scores.push([w, inexactScore, exactScore])
    }
  
    var sorted = scores.sort((a, b) => {
      const scoreA = a[1] + 5 * a[2]
      const scoreB = b[1] + 5 * b[2]
      return scoreB - scoreA
    })
  
    return sorted[0][0]
  }
}

const reader = new InputReader()
async function main(): Promise<void> {
  const words: Set<string> = new Set(JSON.parse(fs.readFileSync('./words.json').toString()))
  var d = new Dictionary(words);
  var candidates = words
  
  while (true) {
    const guess = d.bestGuess()
    console.log(`Next guess:\n${guess}`)

    const letterInstances: Record<string, number> = {}

    const input = await reader.getLine()
    for (var i = 0; i < 5; i++) {
      const curLetter = guess[i]
      var instances = letterInstances[curLetter] ?? 0

      switch (input[i]) {
        case "g": // green
          {
            candidates = intersect(candidates, d.getWordsByPosByLetter(i, curLetter))
            instances += 1
            letterInstances[curLetter] = instances
          }
          break

        case "y": // yellow
          {
            instances += 1
            letterInstances[curLetter] = instances

            candidates = intersect(candidates, d.getWordsContainingLetterAtLeastNTimes(curLetter, instances))
            candidates = subtract(candidates, d.getWordsByPosByLetter(i, curLetter))
          }
          break

        default: // miss
          {
            candidates = subtract(
              candidates,
              d.getWordsContainingLetterAtLeastNTimes(
                curLetter,
                instances + 1 // assume instances is at most 4
              )
            )
          }
          break
      }
    }
    
    console.log(`remaining candidates: ${candidates.size}`)
    if (candidates.size < 10) {
      console.log(candidates)
    }

    d = new Dictionary(candidates)
  }
}

main().catch(err => {
  console.log(err)
  process.exit(1)
})