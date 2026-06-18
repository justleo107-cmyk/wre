// In-memory cache for IP requests rate limiting
const ipRequests = new Map<string, number[]>()

/**
 * Checks if a given User-Agent matches common scraper bots, crawlers, or HTTP clients.
 */
export function detectBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const botKeywords = [
    'python-requests',
    'curl',
    'wget',
    'puppeteer',
    'headless',
    'postmanruntime',
    'insomnia',
    'scraper',
    'spider',
    'crawl',
    'bot',
    'headlesschrome',
    'http-client',
    'axios',
    'node-fetch',
    'got'
  ]
  const uaLower = userAgent.toLowerCase()
  return botKeywords.some(keyword => uaLower.includes(keyword))
}

/**
 * Scans input text or request paths for SQL Injection or Cross-Site Scripting (XSS) payload signatures.
 */
export function detectSqliXss(text: string | null): boolean {
  if (!text) return false
  
  let cleanText = ''
  try {
    cleanText = decodeURIComponent(text).toLowerCase()
  } catch (e) {
    cleanText = text.toLowerCase()
  }

  // Common SQL injection syntax patterns
  const sqliPatterns = [
    /select\s+.*\s+from/i,
    /union\s+all\s+select/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /update\s+.*\s+set/i,
    /(\b(or|and)\b)\s+\d+\s*=\s*\d+(--|\#)/i,
    /(\b(or|and)\b)\s+.*\s*=\s*.*(--|\#)/i,
    /('|"|;)\s*(or|and)\s+\d+\s*=\s*\d+/i,
    /--/,
    /\/\*/,
    /\bexec\b/i
  ]

  // Common XSS tags and event handler patterns
  const xssPatterns = [
    /<script>/i,
    /<\/script>/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /<iframe/i,
    /onmouseover=/i,
    /alert\(/i
  ]

  const hasSqli = sqliPatterns.some(pattern => pattern.test(cleanText))
  const hasXss = xssPatterns.some(pattern => pattern.test(cleanText))
  
  return hasSqli || hasXss
}

/**
 * Scans text content for spam phrases or harassing/profane terms.
 */
export function sanitizeContent(text: string | null): { clean: boolean; blockedWords: string[] } {
  if (!text) return { clean: true, blockedWords: [] }
  const textLower = text.toLowerCase()
  
  const spamAbuseKeywords = [
    'scam', 
    'free money', 
    'double your money', 
    'whatsapp me at', 
    'telegram me', 
    'cashapp me',
    'fuck', 
    'shit', 
    'asshole', 
    'bitch', 
    'scammer', 
    'fraudster',
    'guaranteed returns',
    'crypto doubler'
  ]

  const blocked = spamAbuseKeywords.filter(keyword => textLower.includes(keyword))
  
  return {
    clean: blocked.length === 0,
    blockedWords: blocked
  }
}

/**
 * Performs a rolling sliding window rate limit check for requests from a specific IP address.
 */
export function checkRateLimit(
  ip: string, 
  limit = 100, 
  windowMs = 60000
): { success: boolean; limit: number; remaining: number } {
  const now = Date.now()
  const timestamps = ipRequests.get(ip) || []
  
  // Keep only timestamps within the rolling window
  const windowStart = now - windowMs
  const activeTimestamps = timestamps.filter(t => t > windowStart)
  
  if (activeTimestamps.length >= limit) {
    ipRequests.set(ip, activeTimestamps)
    return { 
      success: false, 
      limit, 
      remaining: 0 
    }
  }

  activeTimestamps.push(now)
  ipRequests.set(ip, activeTimestamps)
  
  return { 
    success: true, 
    limit, 
    remaining: limit - activeTimestamps.length 
  }
}
