const RATE_429_COUNT_KEY = 'rate429Count';
const LAST_429_TIMESTAMP_KEY = 'last429Timestamp';
const RESET_INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

const puns = {
  student: [
    "Whoa, slow down student of the speed arts.",
    "That’s not how office hours work.",
    "One request at a time, champ. This isn’t a cram session.",
    "API’s still reading your last answer.",
  ],
  hacker: [
    "You DDoS with the elegance of a cinder block.",
    "The firewall is laughing at you. Out loud.",
    "Your script just hit a wall. Try coding tact instead.",
    "Even the packet inspector has feelings.",
  ],
  roast: [
    "You’re the reason rate limits exist.",
    "This ain’t DEFCON. Go take a breath, script goblin.",
    "If brute-force was enlightenment, you’d be a guru.",
    "Your click speed has violated several international treaties.",
  ],
  universal: [
    "You overloaded the sarcasm capacitor.",
    "Our electrons are out of breath. Try again.",
    "Nice enthusiasm. Try it again... slower.",
  ],
};

let resetTimer: NodeJS.Timeout | null = null;

const getCount = (): number => {
  try {
    const count = localStorage.getItem(RATE_429_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    return 0;
  }
};

const setCount = (count: number) => {
  try {
    localStorage.setItem(RATE_429_COUNT_KEY, count.toString());
    if (count > 0) {
      localStorage.setItem(LAST_429_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch (error) {
    // ignore
  }
};

const resetCount = () => {
    try {
        localStorage.removeItem(RATE_429_COUNT_KEY);
        localStorage.removeItem(LAST_429_TIMESTAMP_KEY);
    } catch (error) {
        // ignore
    }
};

const startResetTimer = () => {
  if (resetTimer) {
    clearTimeout(resetTimer);
  }
  resetTimer = setTimeout(() => {
    resetCount();
  }, RESET_INACTIVITY_MS);
};

export const recordRateLimitHit = (): { pun: string; tier: number } => {
  let count = getCount();
  count++;
  setCount(count);
  startResetTimer();

  let tier = 0;
  let category: 'student' | 'hacker' | 'roast' | 'universal' = 'student';

  if (count >= 1 && count <= 2) {
    tier = 1;
    category = 'student';
  } else if (count >= 3 && count <= 5) {
    tier = 2;
    category = 'hacker';
  } else if (count >= 6) {
    tier = 3;
    category = 'roast';
  }

  const selectedPuns = puns[category];
  const pun = selectedPuns[Math.floor(Math.random() * selectedPuns.length)];

  return { pun, tier };
};

// Check on load if we need to reset
try {
    const lastTimestamp = localStorage.getItem(LAST_429_TIMESTAMP_KEY);
    if (lastTimestamp) {
        if (Date.now() - parseInt(lastTimestamp, 10) > RESET_INACTIVITY_MS) {
            resetCount();
        } else {
            startResetTimer(); // Re-arm the timer
        }
    }
} catch (error) {
    // ignore
}
