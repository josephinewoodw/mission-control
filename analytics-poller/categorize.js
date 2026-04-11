// categorize.js — Auto-categorization and hook extraction logic

const CATEGORIES = ['Warning', 'Educational', 'Current Events', 'Tech Drama', 'Opinion', 'Other']

/**
 * Auto-suggest a category based on caption text (keyword matching).
 * Manual assignment always takes precedence over suggestions.
 */
export function suggestCategory(caption) {
  if (!caption) return 'Other'
  const lower = caption.toLowerCase()

  // Warning / Threat signals
  if (/\b(don't|stop|never|warning|dangerous|threat|risk|danger|scary|alert|careful|watch out)\b/.test(lower)) {
    return 'Warning'
  }

  // Tech Drama — gossip, controversy, named figures in drama context
  if (/\b(drama|fighting|gossip|keeping up|chapter \d|altman|ronan farrow|farrow|betrayal|coup|supervillain|fired by|fired from|ousted)\b/.test(lower)) {
    return 'Tech Drama'
  }

  // Current events — company names
  if (/\b(chatgpt|openai|google|meta|grok|xai|anthropic|gemini|copilot|sam altman|elon|musk|amazon|microsoft)\b/.test(lower)) {
    return 'Current Events'
  }

  // Educational
  if (/\b(what is|how does|explained?|guide|learn|understand|tutorial|basics?)\b/.test(lower)) {
    return 'Educational'
  }

  // Opinion
  if (/\b(i think|opinion|hot take|rant|unpopular|my take|i believe|change my mind)\b/.test(lower)) {
    return 'Opinion'
  }

  return 'Other'
}

/**
 * Extract hook text from caption (first sentence or line, up to 120 chars).
 */
export function extractHookText(caption) {
  if (!caption) return null

  // Try splitting on newline or period
  const byNewline = caption.split('\n')[0].trim()
  const byPeriod = caption.split('.')[0].trim()

  // Use whichever is shorter (but not empty)
  let hook = byNewline
  if (byPeriod && byPeriod.length < byNewline.length && byPeriod.length > 10) {
    hook = byPeriod
  }

  return hook.substring(0, 120)
}

/**
 * Classify hook type based on hook text content.
 */
export function classifyHookType(hookText) {
  if (!hookText) return 'Other'
  const lower = hookText.toLowerCase().trim()

  // Question — starts with interrogative
  if (/^(do you|did you|why |what |how |would |are you|have you|is |can |could |should |will )/.test(lower)) {
    return 'Question'
  }

  // Warning — strong warning signals
  if (/\b(don't|stop|never|warning|dangerous|threat|risk|danger|careful)\b/.test(lower)) {
    return 'Warning'
  }

  // Statistic — starts with a number or percentage
  if (/^\d/.test(hookText.trim()) || /^[\d%]/.test(hookText.trim())) {
    return 'Statistic'
  }

  // Personal — starts with I/My/We
  if (/^(i |my |we )/.test(lower)) {
    return 'Personal'
  }

  return 'Other'
}

export { CATEGORIES }
