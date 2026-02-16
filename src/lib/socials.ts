import { Github, Instagram, Link as LinkIcon, Twitter, Facebook, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SocialPlatform = {
    name: string;
    icon: LucideIcon;
    baseUrl: string;
    placeholder: string;
};

export const socialPlatforms: Record<string, SocialPlatform> = {
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        baseUrl: 'https://instagram.com/',
        placeholder: 'username'
    },
    twitter: {
        name: 'X / Twitter',
        icon: Twitter,
        baseUrl: 'https://x.com/',
        placeholder: 'username'
    },
    x: {
        name: 'X / Twitter',
        icon: Twitter,
        baseUrl: 'https://x.com/',
        placeholder: 'username'
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        baseUrl: 'https://facebook.com/',
        placeholder: 'username or profile ID'
    },
    github: {
        name: 'GitHub',
        icon: Github,
        baseUrl: 'https://github.com/',
        placeholder: 'username'
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: MessageSquare, // Placeholder for WhatsApp.
        baseUrl: 'https://wa.me/',
        placeholder: 'number with country code'
    },
    discord: {
        name: 'Discord',
        icon: MessageSquare, // No official discord icon in lucide
        baseUrl: 'https://discord.gg/', // For invites, or use https://discord.com/users/ for user IDs
        placeholder: 'username or invite code'
    },
    website: {
        name: 'Website',
        icon: LinkIcon,
        baseUrl: '', // No base URL, should be a full URL
        placeholder: 'https://example.com'
    }
};

export type SocialPlatformKey = keyof typeof socialPlatforms;

export function getSocialPlatformIcon(platform: string): LucideIcon {
    const key = platform.toLowerCase() as SocialPlatformKey;
    if (socialPlatforms[key]) {
        return socialPlatforms[key].icon;
    }
    // Check against name as well for legacy data
    for (const p of Object.values(socialPlatforms)) {
        if (p.name.toLowerCase() === platform.toLowerCase()) {
            return p.icon;
        }
    }
    return LinkIcon;
};

export const isSocialPlatform = (platform: string): boolean => {
    const key = platform.toLowerCase() as SocialPlatformKey;
    // A social platform is anything in our list except a generic website link.
    const isKey = socialPlatforms[key] !== undefined && key !== 'website';
    if(isKey) return true;

    // check by name
     for (const pKey of Object.keys(socialPlatforms)) {
        if (socialPlatforms[pKey].name.toLowerCase() === platform.toLowerCase() && pKey !== 'website') {
            return true;
        }
    }

    return false;
};

export const getSocialLink = (platform: string, value: string): string => {
    let key = platform.toLowerCase() as SocialPlatformKey;
    let social = socialPlatforms[key];

    if (!social) {
        // Fallback to check by name
        for (const pKey of Object.keys(socialPlatforms)) {
            if (socialPlatforms[pKey].name.toLowerCase() === platform.toLowerCase()) {
                key = pKey;
                social = socialPlatforms[key];
                break;
            }
        }
    }
    
    if (!social) return '#';
    
    if (key === 'website') {
      // If it's already a full URL, use it. Otherwise, prefix it.
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
      }
      return `https://${value}`;
    }
    
    // For WhatsApp, remove non-numeric characters
    if (key === 'whatsapp') {
        const numericValue = value.replace(/[^0-9]/g, '');
        return `${social.baseUrl}${numericValue}`;
    }

    // For other platforms, just append the username/value.
    return `${social.baseUrl}${value}`;
}
