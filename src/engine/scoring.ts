import { normalizeForComparison, toLatin, isCyrillic } from './script-converter';

export function checkAnswer(userInput: string, correctAnswer: string): boolean {
  const normalizedInput = normalizeInput(userInput);
  const normalizedCorrect = normalizeInput(correctAnswer);
  return normalizedInput === normalizedCorrect;
}

function normalizeInput(text: string): string {
  let normalized = text.trim();
  if (isCyrillic(normalized)) {
    normalized = toLatin(normalized);
  }
  normalized = normalized
    .toLowerCase()
    .replace(/[.!?,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

export function checkAnswerFuzzy(userInput: string, correctAnswer: string): {
  correct: boolean;
  close: boolean;
} {
  if (checkAnswer(userInput, correctAnswer)) {
    return { correct: true, close: false };
  }

  const normalizedInput = normalizeForComparison(
    isCyrillic(userInput) ? toLatin(userInput) : userInput
  );
  const normalizedCorrect = normalizeForComparison(
    isCyrillic(correctAnswer) ? toLatin(correctAnswer) : correctAnswer
  );

  if (normalizedInput === normalizedCorrect) {
    return { correct: true, close: false };
  }

  const distance = levenshtein(normalizedInput, normalizedCorrect);
  const maxLen = Math.max(normalizedInput.length, normalizedCorrect.length);
  if (maxLen > 0 && distance / maxLen <= 0.2) {
    return { correct: false, close: true };
  }

  return { correct: false, close: false };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}
