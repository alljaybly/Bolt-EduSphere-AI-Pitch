/**
 * Authentication Utilities for EduSphere AI
 * Handles user identification and authentication helpers
 * World's Largest Hackathon Project - EduSphere AI
 */

/**
 * Generate a unique anonymous user ID
 * Creates a timestamp-based ID with random suffix for uniqueness
 * @returns {string} Unique user identifier
 */
function generateAnonymousUserId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `anonymous_${timestamp}_${random}`;
}

/**
 * Get or create user ID from localStorage
 * Handles fallback for environments where localStorage is unavailable
 * @returns {string} User ID
 */
export function getCurrentUserId(): string {
  try {
    const USER_ID_KEY = 'edusphere_user_id';
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      userId = generateAnonymousUserId();
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('Generated new anonymous user ID:', userId);
    }

    return userId;
  } catch (error) {
    console.warn('localStorage not available, using session-based ID:', error);
    if (!(window as any).sessionUserId) {
      (window as any).sessionUserId = generateAnonymousUserId();
    }
    return (window as any).sessionUserId;
  }
}

/**
 * Clear user data and reset to new anonymous user
 * Useful for testing or user logout scenarios
 */
export function clearUserData(): void {
  try {
    const USER_ID_KEY = 'edusphere_user_id';
    localStorage.removeItem(USER_ID_KEY);
    delete (window as any).sessionUserId;
    console.log('User data cleared, will generate new anonymous ID on next access');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

/**
 * Check if user is authenticated (has a valid user ID)
 * @returns {boolean} True if user has a valid ID
 */
export function isUserAuthenticated(): boolean {
  const userId = getCurrentUserId();
  return userId && userId.length > 0;
}

/**
 * Get user display name from localStorage or generate one
 * @returns {string} User display name
 */
export function getUserDisplayName(): string {
  try {
    const displayName = localStorage.getItem('edusphere_user_display_name');
    if (displayName) {
      return displayName;
    }
    
    // Generate a friendly display name
    const adjectives = ['Smart', 'Curious', 'Bright', 'Creative', 'Clever'];
    const nouns = ['Learner', 'Student', 'Explorer', 'Scholar', 'Thinker'];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    const generatedName = `${randomAdjective} ${randomNoun} ${randomNumber}`;
    localStorage.setItem('edusphere_user_display_name', generatedName);
    
    return generatedName;
  } catch (error) {
    console.warn('Could not access localStorage for display name:', error);
    return 'Anonymous Learner';
  }
}

/**
 * Set user display name
 * @param {string} displayName - The display name to set
 */
export function setUserDisplayName(displayName: string): void {
  try {
    localStorage.setItem('edusphere_user_display_name', displayName);
  } catch (error) {
    console.error('Failed to set user display name:', error);
  }
}