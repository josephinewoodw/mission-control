/**
 * Shared utility functions for Mission Control frontend.
 */

/**
 * Format a task title or description for display in the speech bubble.
 * - Strips agent name prefix (e.g. "Scout: " or "Timber: ")
 * - Truncates to maxLen chars with ellipsis
 * - Returns 'Standing by...' for empty input
 */
export function formatBubbleText(text: string, maxLen = 25): string {
  if (!text) return 'Standing by...'
  // Strip "AgentName: " prefix (e.g. "Scout: daily brief" → "daily brief")
  const stripped = text.replace(/^[A-Za-z]+:\s*/, '')
  const trimmed = stripped.trim()
  if (!trimmed) return 'Standing by...'
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen - 1) + '\u2026' : trimmed
}
