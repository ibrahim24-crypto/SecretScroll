import { Github, Instagram, Link, Twitter, Facebook, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SocialPlatform = {
    name: string;
    icon: LucideIcon;
    baseUrl: string;
};

export const socialPlatforms: Record<string, SocialPlatform> = {
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        baseUrl: 'https://instagram.com/',
    },
    twitter: {
        name: 'X / Twitter',
        icon: Twitter,
        baseUrl: 'https://x.com/',
    },
    x: {
        name: 'X / Twitter',
        icon: Twitter,
        baseUrl: 'https://x.com/',
    },
    github: {
        name: 'GitHub',
        icon: Github,
        baseUrl: 'https://github.com/',
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        baseUrl: 'https://facebook.com/',
    },
    discord: {
        name: 'Discord',
        icon: MessageSquare, // No official discord icon in lucide
        baseUrl: 'https://discord.gg/', // For invites, user profiles not linkable
    },
    website: {
        name: 'Website',
        icon: Link,
        baseUrl: '', // No base URL, should be a full URL
    }
};

export type SocialPlatformKey = keyof typeof socialPlatforms;

export function getSocialPlatformIcon(platform: string) {
    const key = platform.toLowerCase() as SocialPlatformKey;
    if (socialPlatforms[key]) {
        return socialPlatforms[key].icon;
    }
    return Link;
};

export const isSocialPlatform = (platform: string): boolean => {
    const key = platform.toLowerCase() as SocialPlatformKey;
    return socialPlatforms[key] !== undefined && key !== 'website';
};

export const getSocialLink = (platform: string, username: string): string => {
    const key = platform.toLowerCase() as SocialPlatformKey;
    const social = socialPlatforms[key];
    if (!social) return '#';
    // For discord, the 'username' is an invite code. For websites, it's a full URL.
    if (key === 'website') {
      if (username.startsWith('http')) return username;
      return `https://${username}`;
    }
    return `${social.baseUrl}${username}`;
}
