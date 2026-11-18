export type Language = 'es' | 'en';

export type Platform =
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'whatsapp'
  | 'threads'
  | 'email'
  | 'web';

export type ChannelCategory = 'messages' | 'comments' | 'emails';

export type WorkspaceSection =
  | 'messages'
  | 'comments'
  | 'emails'
  | 'connections'
  | 'ai_rules'
  | 'trash';

export type SentimentType = 'positive' | 'neutral' | 'urgent' | 'negative';

export type InteractionStatus = 'pending' | 'replied' | 'auto_replied';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  language: Language;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ConnectedAccount {
  id: string;
  ownerId: string;
  platform: Platform;
  profileUrl: string;
  username: string;
  displayLabel: string;
  channelCategory: ChannelCategory;
  status: 'active' | 'paused';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InteractionItem {
  id: string;
  ownerId: string;
  connectionId: string;
  platform: Platform;
  senderName: string;
  senderHandle: string;
  senderAvatar: string;
  subjectOrContext: string;
  body: string;
  isRead: boolean;
  sentiment: SentimentType;
  sentimentScore: number;
  aiSuggestedReply: string;
  replyText: string;
  status: InteractionStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TrashItem {
  id: string;
  ownerId: string;
  originalCollection: ChannelCategory;
  connectionId: string;
  platform: Platform;
  senderName: string;
  senderHandle: string;
  senderAvatar: string;
  subjectOrContext: string;
  body: string;
  sentiment: SentimentType;
  sentimentScore: number;
  aiSuggestedReply: string;
  replyText: string;
  status: InteractionStatus;
  deletedAt?: unknown;
  purgeAtMs: number;
}

export interface FaqRule {
  id: string;
  ownerId: string;
  title: string;
  keywords: string[];
  replyTemplate: string;
  targetChannel: 'all' | ChannelCategory;
  isActive: boolean;
  triggersCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}
