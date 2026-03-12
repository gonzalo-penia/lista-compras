// Shared utilities and business logic
export * from '@familycart/types';

export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export const SOCKET_EVENTS = {
  JOIN_FAMILY: 'family:join',
  LEAVE_FAMILY: 'family:leave',
  ITEM_ADDED: 'list:item:added',
  ITEM_UPDATED: 'list:item:updated',
  ITEM_DELETED: 'list:item:deleted',
  ITEM_CHECKED: 'list:item:checked',
} as const;
