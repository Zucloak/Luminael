import type { UserDeviceData, UserProfile, PastQuiz } from '@/lib/types';
import { USER_DEVICE_DATA_VERSION } from '@/lib/types';
import { getPastQuizzes, addPastQuiz, clearAllPastQuizzes } from '@/lib/indexed-db'; // clearAllPastQuizzes will be added later

const USER_PROFILE_KEY = 'quizmaster_user_profile'; // As seen in use-user.ts

/**
 * Aggregates all user data from localStorage (user profile) and IndexedDB (past quizzes).
 */
export async function aggregateAllUserData(): Promise<UserDeviceData> {
  let userProfile: UserProfile | null = null;
  try {
    const item = window.localStorage.getItem(USER_PROFILE_KEY);
    if (item) {
      userProfile = JSON.parse(item) as UserProfile;
    }
  } catch (error) {
    console.error("Failed to parse user profile from localStorage during aggregation:", error);
    // Decide if we want to throw or continue with profile as null
  }

  let pastQuizzes: PastQuiz[] = [];
  try {
    pastQuizzes = await getPastQuizzes();
  } catch (error) {
    console.error("Failed to get past quizzes from IndexedDB during aggregation:", error);
    // Decide if we want to throw or continue with empty quizzes
  }

  return {
    dataVersion: USER_DEVICE_DATA_VERSION,
    userProfile,
    pastQuizzes,
  };
}

/**
 * Restores all user data to localStorage (user profile) and IndexedDB (past quizzes).
 * This will overwrite existing data.
 */
export async function restoreAllUserData(data: UserDeviceData): Promise<void> {
  if (data.dataVersion !== USER_DEVICE_DATA_VERSION) {
    // Basic version check, could be more sophisticated (e.g., migration logic)
    console.warn(`Data version mismatch. Expected ${USER_DEVICE_DATA_VERSION}, got ${data.dataVersion}. Attempting restore anyway.`);
    // Potentially throw an error or alert the user more strongly
  }

  // Restore User Profile
  try {
    if (data.userProfile) {
      window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data.userProfile));
    } else {
      window.localStorage.removeItem(USER_PROFILE_KEY);
    }
  } catch (error) {
    console.error("Failed to restore user profile to localStorage:", error);
    // Potentially re-throw or notify user
  }

  // Restore Past Quizzes
  try {
    await clearAllPastQuizzes(); // Clear existing quizzes first
    for (const quiz of data.pastQuizzes) {
      // Ensure no duplicate IDs if IndexedDB handles it, or manage IDs carefully.
      // addPastQuiz should handle `put` which overwrites or adds.
      await addPastQuiz(quiz);
    }
  } catch (error) {
    console.error("Failed to restore past quizzes to IndexedDB:", error);
    // Potentially re-throw or notify user
  }
}
