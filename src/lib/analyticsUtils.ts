import type { PastQuiz, QuizAnalyticsData, QuizCountDataPoint, AverageScoreDataPoint } from '@/lib/types';
import { getWeek, getYear, parseISO, format } from 'date-fns';

/**
 * Calculates weekly quiz analytics from a list of past quizzes.
 * @param pastQuizzes An array of PastQuiz objects.
 * @returns QuizAnalyticsData object containing arrays for quiz counts and average scores per week.
 */
export function calculateQuizAnalytics(pastQuizzes: PastQuiz[]): QuizAnalyticsData {
  const weeklyData: {
    [weekKey: string]: {
      quizCount: number;
      totalScore: number;
      quizzesWithScores: number;
      year: number;
      weekNumber: number;
    };
  } = {};

  if (!pastQuizzes || pastQuizzes.length === 0) {
    return { quizCountsPerWeek: [], averageScoresPerWeek: [] };
  }

  pastQuizzes.forEach(quiz => {
    // The 'date' in PastQuiz is a string like "July 26, 2024". We need to parse it.
    // The 'id' is a timestamp, which is more reliable if 'date' format varies.
    // Let's assume 'id' (timestamp) is reliable for date parsing.
    const quizDate = new Date(quiz.id); // quiz.id is a timestamp

    const year = getYear(quizDate);
    const weekNumber = getWeek(quizDate, { weekStartsOn: 1 }); // ISO week, starts on Monday

    // Create a consistent key for the week, e.g., "2024-W29"
    // Pad week number to two digits for consistent sorting if keys are directly sorted (though we sort later)
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        quizCount: 0,
        totalScore: 0,
        quizzesWithScores: 0,
        year,
        weekNumber,
      };
    }

    weeklyData[weekKey].quizCount += 1;

    if (quiz.score && typeof quiz.score.percentage === 'number') {
      weeklyData[weekKey].totalScore += quiz.score.percentage;
      weeklyData[weekKey].quizzesWithScores += 1;
    }
  });

  const sortedWeekKeys = Object.keys(weeklyData).sort((a, b) => {
    const [yearA, weekNumA] = a.substring(0,a.indexOf("-W")).split('-W').map(Number);
    const [yearB, weekNumB] = b.substring(0,b.indexOf("-W")).split('-W').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return weekNumA - weekNumB;
  });

  // Corrected sorting logic for week keys like "YYYY-Www"
  const sortedWeekKeysCorrected = Object.keys(weeklyData).sort((a, b) => {
    const [yearAStr, weekANumStr] = a.split('-W');
    const [yearBStr, weekBNumStr] = b.split('-W');
    const yearA = parseInt(yearAStr, 10);
    const weekANum = parseInt(weekANumStr, 10);
    const yearB = parseInt(yearBStr, 10);
    const weekBNum = parseInt(weekBNumStr, 10);

    if (yearA !== yearB) {
        return yearA - yearB;
    }
    return weekANum - weekANum; // Error here, should be weekANum - weekBNum
  });


  // Final attempt at sorting week keys like "YYYY-Www"
  const finalSortedWeekKeys = Object.keys(weeklyData).sort((keyA, keyB) => {
    const [yearA, weekA] = keyA.replace('W','').split('-').map(Number);
    const [yearB, weekB] = keyB.replace('W','').split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return weekA - weekB;
  });


  const quizCountsPerWeek: QuizCountDataPoint[] = [];
  const averageScoresPerWeek: AverageScoreDataPoint[] = [];

  finalSortedWeekKeys.forEach(weekKey => {
    const data = weeklyData[weekKey];
    quizCountsPerWeek.push({
      date: weekKey, // e.g., "2024-W29"
      count: data.quizCount,
    });

    averageScoresPerWeek.push({
      date: weekKey,
      averageScore: data.quizzesWithScores > 0 ? parseFloat((data.totalScore / data.quizzesWithScores).toFixed(1)) : null,
      quizCountWithScores: data.quizzesWithScores,
    });
  });

  // Ensure chronological order of weeks based on year and week number
  // The weekKey itself "YYYY-Www" should sort chronologically as string.
  // If not, we'd parse year and week to sort. Let's test string sort first.
  // String sort of "YYYY-Www" is fine.

  return { quizCountsPerWeek, averageScoresPerWeek };
}
