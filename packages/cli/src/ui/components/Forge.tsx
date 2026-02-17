/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import { Box, Text, useInput, Spacer } from 'ink';
import { useConfig } from '../contexts/ConfigContext.js';
import {
  ForgeService,
  type ActionEntry,
  type SwarmAgentStatus,
  type ForgeStats,
  type AgentIdentity,
  type BankAccount,
  type BazaarItem,
  type Relation
} from 'phill-cli-core';
import { useUIActions } from '../contexts/UIActionsContext.js';
import * as os from 'node:os';
import { theme } from '../semantic-colors.js';

type Tab = 'feed' | 'swarm' | 'metropolis' | 'identity' | 'observer';

const ASCII_HEADER = `
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══════╝ ╚══════╝
`;

const ProgressBar = ({ percent, width = 20, color = 'green' }: { percent: number; width?: number; color?: string }) => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return (
    <Text color={color}>
      {'█'.repeat(filled)}
      {'░'.repeat(empty)} {Math.round(percent)}%
    </Text>
  );
};

const Ticker = ({ items }: { items: string[] }) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.border.default} padding={1}>
      <Text bold color={theme.text.accent}>LIVE MARKET DATA STREAM</Text>
      {items.slice(0, 5).map((item, i) => (
        <Box key={i} marginY={0}>
          <Text color={i === 0 ? theme.text.primary : theme.text.dim}>{item}</Text>
        </Box>
      ))}
      <Text dimColor>...</Text>
    </Box>
  );
};

export const Forge: React.FC = () => {
  const config = useConfig();
  const { setForgeOpen } = useUIActions();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<ActionEntry[]>([]);
  const [swarm, setSwarm] = useState<SwarmAgentStatus[]>([]);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [stats, setStats] = useState<ForgeStats | null>(null);
  const [bank, setBank] = useState<BankAccount | null>(null);
  const [bazaar, setBazaar] = useState<BazaarItem[]>([]);
  const [social, setSocial] = useState<Relation[]>([]);
  const [globalFeed, setGlobalFeed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const forge = ForgeService.getInstance(config);
        const [feedData, swarmData, identityData, statsData, bankData, bazaarData, socialData, globalFeedData] = await Promise.all([
          forge.getPhillbookFeed(),
          forge.getSwarmStatus(),
          forge.getIdentity(),
          forge.getObserverStats(),
          forge.getBankAccount(),
          forge.getBazaarListings(),
          forge.getSocialRelations(),
          forge.getMetropolisGlobalFeed()
        ]);
        setFeed(feedData);
        setSwarm(swarmData);
        setIdentity(identityData);
        setStats(statsData);
        setBank(bankData);
        setBazaar(bazaarData);
        setSocial(socialData);
        setGlobalFeed(globalFeedData);
      } catch (e) {
        console.error("Failed to load Forge data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Refresh stats periodically
    const interval = setInterval(async () => {
      const forge = ForgeService.getInstance(config);
      const newStats = await forge.getObserverStats();
      const newGlobalFeed = await forge.getMetropolisGlobalFeed();
      setStats(newStats);
      setGlobalFeed(newGlobalFeed);
    }, 2000);
    return () => clearInterval(interval);
  }, [config]);

  // Keyboard Navigation
  useInput((input, key) => {
    if (key.leftArrow) {
      if (activeTab === 'swarm') setActiveTab('feed');
      if (activeTab === 'metropolis') setActiveTab('swarm');
      if (activeTab === 'identity') setActiveTab('metropolis');
      if (activeTab === 'observer') setActiveTab('identity');
    }
    if (key.rightArrow) {
      if (activeTab === 'feed') setActiveTab('swarm');
      if (activeTab === 'swarm') setActiveTab('metropolis');
      if (activeTab === 'metropolis') setActiveTab('identity');
      if (activeTab === 'identity') setActiveTab('observer');
    }
    if (key.escape) {
      setForgeOpen(false);
    }
  });

  const renderTabHeader = (id: Tab, label: string) => {
    const isActive = activeTab === id;
    return (
      <Box
        borderStyle={isActive ? 'round' : undefined}
        borderColor={isActive ? theme.border.focused : undefined}
        paddingX={1}
        marginRight={1}
      >
        <Text color={isActive ? theme.text.primary : theme.text.dim} bold={isActive}>
          {label}
        </Text>
      </Box>
    );
  };

  const renderFeed = () => {
    // Limit to last 20 entries for performance
    const displayFeed = feed.slice(0, 20);

    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
        <Text bold color={theme.text.primary} underline>PHILLBOOK FEED (LATEST 20)</Text>
        <Box flexDirection="column" marginTop={1}>
          {displayFeed.length === 0 ? (
            <Text color={theme.text.dim}>No recent activity recorded.</Text>
          ) : (
            displayFeed.map((entry, i) => (
              <Box key={i} flexDirection="column" marginBottom={1} borderStyle="single" borderColor={entry.riskLevel === 'High' ? theme.status.error : theme.border.default} padding={1}>
                <Box justifyContent="space-between">
                  {/* "Routed" visual indicator */}
                  <Text color={theme.text.accent}> ⚡ ACTION #{feed.length - i}</Text>
                  <Text color={theme.text.dim}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
                </Box>
                <Box marginY={0}>
                  <Text bold color={theme.text.primary}>Tool: </Text><Text color={theme.text.secondary}>{entry.tool}</Text>
                </Box>

                {entry.params && (
                  <Box flexDirection="column" marginLeft={1}>
                    <Text color={theme.text.dim}>Params:</Text>
                    <Text color={theme.text.accent} wrap="truncate-end">
                      {JSON.stringify(entry.params).substring(0, 60)}{JSON.stringify(entry.params).length > 60 ? '...' : ''}
                    </Text>
                  </Box>
                )}
                <Box marginTop={0} justifyContent="flex-end">
                  <Text color={entry.riskLevel === 'High' ? theme.status.error : entry.riskLevel === 'Medium' ? theme.status.warning : theme.status.success}>
                    [{entry.riskLevel.toUpperCase()}]
                  </Text>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    );
  };

  const renderSwarm = () => (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
      <Text bold color={theme.text.primary} underline>ACTIVE AGENT GRID</Text>
      <Box flexDirection="row" flexWrap="wrap" marginTop={1} justifyContent="flex-start">
        {swarm.length === 0 ? (
          <Text color={theme.text.dim}>No agents online.</Text>
        ) : (
          swarm.map((agent, i) => (
            <Box
              key={i}
              flexDirection="column"
              width={38}
              height={12}
              borderStyle="round"
              borderColor={theme.text.accent}
              padding={1}
              marginRight={1}
              marginBottom={1}
            >
              <Box justifyContent="space-between">
                <Text bold color={theme.text.primary} wrap="truncate-end">{agent.name}</Text>
                <Text color={theme.status.success}>●</Text>
              </Box>
              <Box marginY={1} height={2}>
                <Text wrap="truncate-end" color={theme.text.secondary}>{agent.description}</Text>
              </Box>

              <Box flexDirection="column" marginTop={0} flexGrow={1}>
                <Text bold underline color={theme.text.primary}>Capabilities:</Text>
                {agent.capabilities && agent.capabilities.slice(0, 3).map((cap, j) => (
                  <Text key={j} color={theme.text.accent} wrap="truncate-end">- {typeof cap === 'string' ? cap : JSON.stringify(cap)}</Text>
                ))}
                {agent.capabilities && agent.capabilities.length > 3 && <Text color={theme.text.dim}>...more</Text>}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );

  const renderMetropolis = () => {
    if (!identity) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
          <Text bold color={theme.text.primary} underline>METROPOLIS GLOBAL VIEW</Text>
          <Box marginTop={1} flexDirection="row">
            <Box width="50%" paddingRight={2}>
              <Box borderStyle="single" borderColor={theme.status.success} padding={1} flexDirection="column" marginBottom={1}>
                <Text bold color={theme.text.primary}>MARKET STATUS</Text>
                <Text color={theme.status.success}>BULLISH TREND</Text>
                <Text color={theme.text.dim}>Vol: High | Liq: Deep</Text>
              </Box>
              <Box borderStyle="single" borderColor={theme.border.default} padding={1}>
                <Text color={theme.text.dim}>GUEST ACCESS RESTRICTED</Text>
                <Text>Personal Finance Vault Locked.</Text>
              </Box>
            </Box>
            <Box width="50%">
              <Ticker items={globalFeed} />
            </Box>
          </Box>
        </Box>
      );
    }
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
        <Text bold color={theme.text.primary} underline>METROPOLIS HUB</Text>
        <Box flexDirection="row" marginTop={1}>
          {/* Metropolis Bank */}
          <Box flexDirection="column" width="33%" marginRight={1} borderStyle="round" borderColor={theme.text.accent} padding={1}>
            <Text bold underline color={theme.text.primary}>METROPOLIS BANK</Text>
            <Box marginTop={1}>
              <Text color={theme.text.primary}>Balance: </Text>
              <Text bold color={theme.status.success}>{bank?.balance.toFixed(2)} CREDITS</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text color={theme.text.dim}>Recent Transactions:</Text>
              {bank?.transactions.slice(0, 3).map((tx, i) => (
                <Box key={i} justifyContent="space-between">
                  <Text color={theme.text.secondary} wrap="truncate-end">{tx.description}</Text>
                  <Text color={tx.type === 'credit' ? theme.status.success : theme.status.error}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Bazaar */}
          <Box flexDirection="column" width="33%" marginRight={1} borderStyle="single" borderColor={theme.border.default} padding={1}>
            <Text bold underline color={theme.text.primary}>THE BAZAAR</Text>
            <Box marginTop={1} flexDirection="column">
              {bazaar.map((item, i) => (
                <Box key={i} marginBottom={1} flexDirection="column">
                  <Box justifyContent="space-between">
                    <Text bold color={theme.text.accent}>{item.name}</Text>
                    <Text color={theme.status.warning}>{item.price}c</Text>
                  </Box>
                  <Text color={theme.text.dim} wrap="truncate">{item.description}</Text>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Social / Marriage */}
          <Box flexDirection="column" width="33%" borderStyle="single" borderColor={theme.border.default} padding={1}>
            <Text bold underline color={theme.text.primary}>SOCIAL / MARRIAGE</Text>
            <Box marginTop={1} flexDirection="column">
              {social.length === 0 ? (
                <Text color={theme.text.dim}>No active partnerships.</Text>
              ) : (
                social.map((rel, i) => (
                  <Box key={i} marginBottom={1} flexDirection="column">
                    <Text bold color={theme.text.primary}>{rel.type} w/ {rel.partnerName}</Text>
                    <Text color={theme.status.success}>{rel.status}</Text>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderIdentity = () => (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
      <Text bold color={theme.text.primary} underline>IDENTITY MATRIX</Text>
      {identity ? (
        <Box flexDirection="column" marginTop={1} borderStyle="double" borderColor={theme.text.accent} padding={1}>
          <Box marginBottom={1}>
            <Text bold color={theme.text.primary} backgroundColor={theme.text.accent}> {identity.name?.toUpperCase() || 'UNKNOWN'} </Text>
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            <Text bold color={theme.text.primary}>Voice Module:</Text>
            <Text color={theme.text.accent}>{identity.voiceName || 'Default Synthesizer'}</Text>
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            <Text bold color={theme.text.primary}>Personality Driver:</Text>
            <Text color={theme.text.accent}>{identity.speechStyle || 'Standard Protocol'}</Text>
          </Box>

          <Box flexDirection="column">
            <Text bold color={theme.text.primary}>Directive:</Text>
            <Text color={theme.text.secondary}>{identity.description || 'No description provided.'}</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={theme.border.default} padding={1}>
          <Text bold color={theme.text.dim}>GUEST IDENTITY ACTIVE</Text>
          <Text color={theme.text.secondary}>No persistent agent identity found.</Text>
        </Box>
      )}
    </Box>
  );

  const renderObserver = () => (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor={theme.border.default}>
      <Text bold color={theme.text.primary} underline>SYSTEM OBSERVER GRID</Text>
      {stats ? (
        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Box borderStyle="single" borderColor={theme.border.default} padding={1} width="48%">
              <Text bold color={theme.text.primary}>System Uptime</Text>
              <Text bold color={theme.status.success}>{Math.floor(stats.uptime)}s</Text>
            </Box>
            <Box borderStyle="single" borderColor={theme.border.default} padding={1} width="48%">
              <Text bold color={theme.text.primary}>Platform</Text>
              <Text color={theme.text.link}>{os.platform()} {os.release()}</Text>
              <Text color={theme.text.dim}>{os.arch()}</Text>
            </Box>
          </Box>

          <Box borderStyle="single" borderColor={theme.text.accent} padding={1} flexDirection="column">
            <Text bold color={theme.text.primary}>Live Memory Grid</Text>
            <Box flexDirection="column" marginBottom={1} marginTop={1}>
              <Box justifyContent="space-between">
                <Text color={theme.text.secondary}>RSS</Text>
                <Text color={theme.text.dim}>{Math.round(stats.memoryUsage.rss / 1024 / 1024)} MB</Text>
              </Box>
              <ProgressBar percent={(stats.memoryUsage.rss / (os.totalmem?.() || 1024 * 1024 * 1024 * 16)) * 100} color={theme.status.warning} width={40} />
            </Box>

            <Box flexDirection="column">
              <Box justifyContent="space-between">
                <Text color={theme.text.secondary}>Heap</Text>
                <Text color={theme.text.dim}>{Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)} MB</Text>
              </Box>
              <ProgressBar percent={(stats.memoryUsage.heapUsed / stats.memoryUsage.heapTotal) * 100} color={theme.text.link} width={40} />
            </Box>
          </Box>
        </Box>
      ) : (
        <Text color={theme.text.dim}>Initializing sensors...</Text>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" height={20} flexDirection="column">
        <Text color={theme.text.primary}>{ASCII_HEADER}</Text>
        <Text color={theme.text.secondary}>Initializing Forge Systems...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={theme.border.focused} padding={1} width="100%">
      <Box justifyContent="center" marginBottom={1}>
        <Text color={theme.text.primary}>{ASCII_HEADER}</Text>
      </Box>

      <Box flexDirection="row" marginBottom={1} borderBottom={true} borderStyle="single" borderColor={theme.text.accent}>
        {renderTabHeader('feed', 'PHILLBOOK')}
        {renderTabHeader('swarm', 'SWARM NET')}
        {renderTabHeader('metropolis', 'METROPOLIS')}
        {renderTabHeader('identity', 'IDENTITY')}
        {renderTabHeader('observer', 'OBSERVER')}
        <Spacer />
        <Text color={theme.text.dim}>System: ONLINE</Text>
      </Box>

      <Box height={28} overflowY="hidden">
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'swarm' && renderSwarm()}
        {activeTab === 'metropolis' && renderMetropolis()}
        {activeTab === 'identity' && renderIdentity()}
        {activeTab === 'observer' && renderObserver()}
      </Box>

      <Box marginTop={1} borderTop={true} borderStyle="single" borderColor={theme.border.default} paddingTop={1} justifyContent="space-between">
        <Text color={theme.text.dim}>NAVIGATE: [←/→]   EXIT: [ESC]</Text>
        <Text color={theme.text.accent}>THE FORGE v1.1.0</Text>
      </Box>
    </Box>
  );
};

