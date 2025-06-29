/**
 * Authentication Utilities for EduSphere AI
 * Centralized user identification and authentication helpers
 * World's Largest Hackathon Project - EduSphere AI
 */

import { supabase } from './supabase';

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
 * Get current user ID from various sources
 * Priority: Supabase auth > localStorage > generate new anonymous ID
 * @returns {Promise<string>} User ID
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    // First, try to get authenticated user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }

    // Fallback to localStorage
    const storedUserId = localStorage.getItem('edusphere_user_id');
    if (storedUserId) {
      return storedUserId;
    }

    // Generate new anonymous ID and store it
    const newUserId = generateAnonymousUserId();
    localStorage.setItem('edusphere_user_id', newUserId);
    return newUserId;

  } catch (error) {
    console.warn('Error getting user ID, using fallback:', error);
    
    // Final fallback - try localStorage or generate new
    try {
      const storedUserId = localStorage.getItem('edusphere_user_id');
      if (storedUserId) {
        return storedUserId;
      }
    } catch (storageError) {
      console.warn('localStorage not available:', storageError);
    }

    // Generate session-based ID if localStorage fails
    if (!window.sessionUserId) {
      window.sessionUserId = generateAnonymousUserId();
    }
    return window.sessionUserId;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.warn('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get authenticated user data
 * @returns {Promise<any>} User data or null
 */
export async function getAuthenticatedUser(): Promise<any> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.warn('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Safe JSON parse utility
 * @param {string} text - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed object or fallback
 */
export function safeJsonParse(text: string, fallback: any = null): any {
  try {
    if (!text || text.trim() === '') {
      return fallback;
    }
    return JSON.parse(text);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Clear user data and reset to new anonymous user
 */
export function clearUserData(): void {
  try {
    localStorage.removeItem('edusphere_user_id');
    delete window.sessionUserId;
    console.log('User data cleared');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    sessionUserId?: string;
  }
}