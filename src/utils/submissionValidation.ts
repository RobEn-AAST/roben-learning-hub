import type { SubmissionPlatform } from '@/types/project';
import { PLATFORM_NAMES, PLATFORM_EXAMPLES } from '@/types/submission';

// Platform-specific URL validation patterns
const PLATFORM_PATTERNS: Record<SubmissionPlatform, RegExp> = {
  github: /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+/i,
  gitlab: /^https?:\/\/(www\.)?gitlab\.com\/[\w-]+\/[\w.-]+/i,
  bitbucket: /^https?:\/\/(www\.)?bitbucket\.org\/[\w-]+\/[\w.-]+/i,
  google_drive: /^https?:\/\/(drive|docs)\.google\.com\/(file\/d\/|drive\/folders\/|open\?id=)/i,
  onedrive: /^https?:\/\/(1drv\.ms|onedrive\.live\.com)/i,
  dropbox: /^https?:\/\/(www\.)?dropbox\.com\/(s|sh|scl)\/[\w-]+/i,
  other: /^https?:\/\/.+/i, // Any valid URL
};

/**
 * Validate submission link against platform pattern
 */
export function validateSubmissionLink(link: string, platform: SubmissionPlatform): { valid: boolean; message: string } {
  if (!link || link.trim() === '') {
    return { valid: false, message: 'Submission link is required' };
  }

  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return { valid: false, message: 'Invalid platform selected' };
  }

  if (!pattern.test(link)) {
    return {
      valid: false,
      message: `Invalid ${PLATFORM_NAMES[platform]} link. Example: ${PLATFORM_EXAMPLES[platform]}`
    };
  }

  return { valid: true, message: 'Link is valid' };
}
