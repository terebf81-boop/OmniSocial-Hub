/**
 * Security Rule Verification Harness for OmniChat Hub ("Dirty Dozen" Payloads).
 * Run with Firebase Emulator Suite (`@firebase/rules-unit-testing`) when testing locally.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Cross-Tenant Read',
    collectionPath: 'users/userA/messages/msg1',
    operation: 'get',
    auth: { uid: 'userB', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'User Directory Enumeration',
    collectionPath: 'users',
    operation: 'list',
    auth: { uid: 'userA', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Spoof Write',
    collectionPath: 'users/userA',
    operation: 'create',
    auth: { uid: 'userA', email_verified: false },
    payload: {
      uid: 'userA',
      email: 'a@example.com',
      displayName: 'User A',
      language: 'es',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'OwnerId Spoofing on Create',
    collectionPath: 'users/userA/connections/c1',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      id: 'c1',
      ownerId: 'userB',
      platform: 'instagram',
      profileUrl: 'https://instagram.com/demo',
      username: '@demo',
      displayLabel: 'Instagram @demo',
      channelCategory: 'comments',
      status: 'active',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection',
    collectionPath: 'users/userA',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      uid: 'userA',
      email: 'a@example.com',
      displayName: 'User A',
      language: 'es',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning (Oversized ID)',
    collectionPath: `users/userA/messages/${'x'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: { id: 'x'.repeat(200) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Timestamp Forgery on Create',
    collectionPath: 'users/userA/emails/e1',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      id: 'e1',
      ownerId: 'userA',
      createdAt: new Date('2020-01-01T00:00:00Z'),
      updatedAt: new Date('2020-01-01T00:00:00Z'),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Mutation',
    collectionPath: 'users/userA/messages/m1',
    operation: 'update',
    auth: { uid: 'userA', email_verified: true },
    payload: { ownerId: 'userB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Disallowed Update Key',
    collectionPath: 'users/userA/connections/c1',
    operation: 'update',
    auth: { uid: 'userA', email_verified: true },
    payload: { platform: 'tiktok' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Payload Exhaustion (20KB Body)',
    collectionPath: 'users/userA/comments/c1',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: { body: 'a'.repeat(20000) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Injection in FaqRules',
    collectionPath: 'users/userA/faqRules/r1',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      keywords: Array.from({ length: 25 }, (_, i) => `k${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Invalid Enum Value in Trash',
    collectionPath: 'users/userA/trash/t1',
    operation: 'create',
    auth: { uid: 'userA', email_verified: true },
    payload: { originalCollection: 'admins' },
    expected: 'PERMISSION_DENIED',
  },
];
