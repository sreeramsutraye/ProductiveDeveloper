import { useState, useEffect } from 'react'
import { Lightbulb, ThumbsUp, ThumbsDown, Clock } from 'lucide-react'

const FACTS = [
  { text: "JavaScript was written in just 10 days by Brendan Eich in May 1995. It was originally called Mocha, then LiveScript, before finally becoming JavaScript.", source: "Brendan Eich" },
  { text: "The first computer bug was an actual bug — a moth found trapped in a relay of the Harvard Mark II computer in 1947. Grace Hopper's team taped it into the logbook.", source: "Harvard, 1947" },
  { text: "Python was named after Monty Python's Flying Circus, not the snake. Guido van Rossum was reading Monty Python scripts while developing the language.", source: "Guido van Rossum" },
  { text: "Git was created by Linus Torvalds in just 2 weeks in April 2005, after a licensing dispute made the BitKeeper VCS unavailable to the Linux project.", source: "Linux Foundation" },
  { text: "The Apollo 11 guidance computer had only 4 KB of RAM and 32 KB of ROM. Your browser tab right now is using thousands of times more memory.", source: "NASA" },
  { text: "Linux powers over 96% of the world's top 1 million web servers — and nearly 100% of the world's supercomputers.", source: "W3Techs" },
  { text: "The first domain name ever registered was Symbolics.com on March 15, 1985. It's still active today and is the world's oldest registered domain.", source: "Internet history" },
  { text: "Email is older than the World Wide Web by 20 years. Ray Tomlinson sent the first email in 1971 — he can't remember what it said.", source: "Ray Tomlinson" },
  { text: "The @ symbol in email addresses was chosen by Ray Tomlinson specifically because it wasn't used in people's names, making it a clean separator.", source: "Ray Tomlinson" },
  { text: "TypeScript was created by Anders Hejlsberg — the same engineer who previously created Turbo Pascal and C#. Three major languages, one person.", source: "Microsoft" },
  { text: "The world's first website is still live. Tim Berners-Lee launched it on August 6, 1991, at info.cern.ch — it was a page about the World Wide Web project itself.", source: "CERN" },
  { text: "Stack Overflow was founded in 2008. By 2024 it hosts over 58 million questions and answers, and estimates suggest 50 million developers visit it monthly.", source: "Stack Overflow" },
  { text: "There are more possible iterations of a chess game than atoms in the observable universe. The Shannon number estimates 10¹²⁰ possible games.", source: "Claude Shannon, 1950" },
  { text: "The average webpage today (≈2.5 MB) is heavier than the entire original DOOM game (≈2.4 MB). You could ship DOOM inside a web page.", source: "HTTP Archive" },
  { text: "GOTO was declared harmful in a famous 1968 open letter by Edsger Dijkstra. He was paid per line of published text, so the title was shortened to save space.", source: "Dijkstra, 1968" },
  { text: "The first version of Windows (1.0) shipped in 1985 and was widely mocked — it couldn't even overlap windows. Bill Gates called it a 'box of potential.'", source: "Microsoft, 1985" },
  { text: "Linus Torvalds wanted to name Linux 'Freax' (from free + freak + Unix). His FTP server admin, Ari Lemmke, uploaded it under the directory name 'Linux' without asking.", source: "Linux history" },
  { text: "NASA still runs FORTRAN code written in the 1970s in some mission-critical systems. If it works and the cost of replacement is high, it stays.", source: "NASA" },
  { text: "The first computer virus, 'Creeper' (1971), didn't destroy anything. It just printed 'I'm the creeper, catch me if you can!' and spread across ARPANET.", source: "BBN Technologies, 1971" },
  { text: "Over 500 hours of video are uploaded to YouTube every single minute — that's more content than any human could watch in several lifetimes.", source: "YouTube, 2022" },
  { text: "The first iPhone (2007) had 128 MB of RAM. The iPhone 16 Pro has 8 GB — a 64× increase in under 20 years.", source: "Apple" },
  { text: "About 90% of all data ever created was generated in the last two years. The pace of data creation is accelerating faster than storage can keep up.", source: "IBM Marketing Cloud" },
  { text: "The term 'debugging' predates computers. In 1878, Thomas Edison wrote about 'bugs' in his electrical circuits — mechanical faults in an otherwise working system.", source: "Thomas Edison" },
  { text: "In 2016, a coding error in a smart contract called 'The DAO' on Ethereum allowed a hacker to drain $60M. The community forked the entire blockchain to undo it.", source: "Ethereum Foundation, 2016" },
  { text: "The average developer writes about 10-12 lines of production-ready code per day when you factor in design, debugging, code review, and meetings.", source: "McConnell, Code Complete" },
]

const SLOT_MS = 4 * 60 * 60 * 1000 // 4 hours

function getCurrentSlot() {
  return Math.floor(Date.now() / SLOT_MS)
}

function getFactIndex() {
  return getCurrentSlot() % FACTS.length
}

function getTimeUntilNext() {
  const next = (getCurrentSlot() + 1) * SLOT_MS
  const ms   = next - Date.now()
  const h    = Math.floor(ms / 3600000)
  const m    = Math.floor((ms % 3600000) / 60000)
  return { h, m }
}

const STORAGE_KEY = 'funfact_reactions' // { [slotIndex]: 'like' | 'dislike' | null }

export default function FunFact() {
  const [factIndex, setFactIndex] = useState(getFactIndex)
  const [timeLeft, setTimeLeft]   = useState(getTimeUntilNext)
  const [reactions, setReactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    catch { return {} }
  })

  // Rotate fact on the hour boundary
  useEffect(() => {
    const id = setInterval(() => {
      const newIdx = getFactIndex()
      if (newIdx !== factIndex) setFactIndex(newIdx)
      setTimeLeft(getTimeUntilNext())
    }, 30_000) // check every 30 s
    return () => clearInterval(id)
  }, [factIndex])

  const fact    = FACTS[factIndex]
  const slotKey = String(getCurrentSlot())
  const myReaction = reactions[slotKey] ?? null

  const react = (type) => {
    const next = { ...reactions, [slotKey]: myReaction === type ? null : type }
    setReactions(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 p-5 sm:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 dark:bg-amber-500/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Did you know?</span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Next fact in {timeLeft.h}h {timeLeft.m}m
        </div>
      </div>

      {/* Fact text */}
      <p className="text-sm sm:text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 mb-3">
        {fact.text}
      </p>

      {/* Source + reactions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-amber-600/70 dark:text-amber-500/70 font-medium">— {fact.source}</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => react('like')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              myReaction === 'like'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-white/60 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Cool!
          </button>
          <button
            onClick={() => react('dislike')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              myReaction === 'dislike'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                : 'bg-white/60 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-400'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            Meh
          </button>
        </div>
      </div>
    </div>
  )
}