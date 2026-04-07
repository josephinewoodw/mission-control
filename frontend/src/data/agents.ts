import type { AgentInfo, AgentState } from '../types'

export const AGENTS: Record<string, AgentInfo> = {
  fern: {
    name: 'fern',
    displayName: 'Fern',
    role: 'Coordinator',
    emoji: '\u{1F33F}',
    color: '#a8d8a8',
    avatar: '/assets/fern-avatar.png',
    station: 'Center Desk',
  },
  scout: {
    name: 'scout',
    displayName: 'Scout',
    role: 'Research',
    emoji: '\u{1F50D}',
    color: '#a8c8d8',
    avatar: '/assets/scout-avatar.png',
    station: 'Research Station',
  },
  reed: {
    name: 'reed',
    displayName: 'Reed',
    role: 'Content',
    emoji: '\u{1F3A8}',
    color: '#d8c8a8',
    avatar: '/assets/reed-avatar.png',
    station: 'Writing Desk',
  },
  sentinel: {
    name: 'sentinel',
    displayName: 'Sentinel',
    role: 'Security',
    emoji: '\u{1F6E1}\u{FE0F}',
    color: '#c8a8d8',
    avatar: '/assets/sentinel-avatar.png',
    station: 'Monitoring Station',
  },
  timber: {
    name: 'timber',
    displayName: 'Timber',
    role: 'Engineering',
    emoji: '\u{1FAB5}',
    color: '#d8a888',
    avatar: '/assets/timber-avatar.png',
    station: 'Engineering Desk',
  },
  tide: {
    name: 'tide',
    displayName: 'Tide',
    role: 'Prediction Market Trader',
    emoji: '\u{1F30A}',
    color: '#7ecec4',
    avatar: '/assets/tide-avatar.png',
    station: 'Trading Desk',
  },
}

export const AGENT_LIST = Object.values(AGENTS)

export function defaultAgentState(name: string): AgentState {
  return {
    name: name as AgentState['name'],
    status: 'offline',
    currentTask: '',
    highLevelTask: 'Standing by...',
    lastActivity: null,
    lastEvent: '',
    eventCount: 0,
    blockedTool: null,
    blockedSince: null,
  }
}
