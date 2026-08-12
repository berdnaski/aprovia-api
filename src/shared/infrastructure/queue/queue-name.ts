export const QueueName = {
  AI_EXTRACTION: 'ai-extraction',
  NOTIFICATIONS: 'notifications',
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];
