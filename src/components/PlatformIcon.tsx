import {
  Camera,
  Globe,
  Linkedin,
  Mail,
  MessageCircle,
  PlaySquare,
  Share2,
  Video,
  AtSign,
} from 'lucide-react';
import type { Platform } from '../types/omnichat';

export function getPlatformName(platform: Platform): string {
  const labels: Record<Platform, string> = {
    instagram: 'Instagram',
    x: 'X',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    threads: 'Threads',
    email: 'Email',
    web: 'Web',
  };
  return labels[platform] || 'Social';
}

export function PlatformIcon({
  platform,
  className = 'w-4 h-4',
}: {
  platform: Platform;
  className?: string;
}) {
  switch (platform) {
    case 'instagram':
      return <Camera className={className} />;
    case 'whatsapp':
      return <MessageCircle className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'youtube':
      return <PlaySquare className={className} />;
    case 'tiktok':
      return <Video className={className} />;
    case 'x':
      return <AtSign className={className} />;
    case 'facebook':
    case 'threads':
      return <Share2 className={className} />;
    default:
      return <Globe className={className} />;
  }
}
