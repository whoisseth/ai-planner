import { TASK_MANAGEMENT_KEYWORDS } from '../constants/chatConstants';

/**
 * Detects if a message indicates task management intent
 */
export function isTaskManagementIntent(message: string): boolean {
  const lowercaseMessage = message.toLowerCase();
  const allKeywords = [
    ...TASK_MANAGEMENT_KEYWORDS.creation,
    ...TASK_MANAGEMENT_KEYWORDS.viewing
  ];
  
  return allKeywords.some(keyword => lowercaseMessage.includes(keyword));
} 