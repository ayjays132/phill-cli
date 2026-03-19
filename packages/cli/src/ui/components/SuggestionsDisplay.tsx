/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { ExpandableText, MAX_WIDTH } from './shared/ExpandableText.js';
import { CommandKind } from '../commands/types.js';
import { sanitizeForDisplay } from '../utils/textUtils.js';
import { AGI_THEME, PULSE_DOT } from '../AppContainer.js';

export interface Suggestion {
  label: string;
  value: string;
  description?: string;
  matchedIndex?: number;
  commandKind?: CommandKind;
}

interface SuggestionsDisplayProps {
  suggestions: Suggestion[];
  activeIndex: number;
  isLoading: boolean;
  width: number;
  scrollOffset: number;
  userInput: string;
  mode: 'reverse' | 'slash';
  expandedIndex?: number;
}

export const MAX_SUGGESTIONS_TO_SHOW = 8;
export { MAX_WIDTH };

export function SuggestionsDisplay({
  suggestions,
  activeIndex,
  isLoading,
  width,
  scrollOffset,
  userInput,
  mode,
  expandedIndex,
}: SuggestionsDisplayProps) {
  if (isLoading) {
    return (
      <Box paddingX={1} width={width}>
        <Text color={AGI_THEME.muted}>
          <Text color={AGI_THEME.glow}>{PULSE_DOT}</Text> SCANNING MATRIX...
        </Text>
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const startIndex = scrollOffset;
  const endIndex = Math.min(
    scrollOffset + MAX_SUGGESTIONS_TO_SHOW,
    suggestions.length,
  );
  const visibleSuggestions = suggestions.slice(startIndex, endIndex);

  const COMMAND_KIND_SUFFIX: Partial<Record<CommandKind, string>> = {
    [CommandKind.MCP_PROMPT]: ' [MCP]',
    [CommandKind.AGENT]: ' [AGENT]',
  };

  const getFullLabel = (s: Suggestion) => {
    const icon = s.commandKind === CommandKind.AGENT ? '⚛ ' :
      s.commandKind === CommandKind.BUILT_IN ? '⌬ ' :
        s.commandKind === CommandKind.MCP_PROMPT ? '⌘ ' : '';
    return icon + s.label + (s.commandKind ? (COMMAND_KIND_SUFFIX[s.commandKind] ?? '') : '');
  };

  const maxLabelLength = Math.max(
    ...suggestions.map((s) => getFullLabel(s).length),
  );
  const commandColumnWidth =
    mode === 'slash' ? Math.min(maxLabelLength, Math.floor(width * 0.5)) : 0;

  return (
    <Box flexDirection="column" paddingX={1} width={width} marginBottom={1}>
      {scrollOffset > 0 && (
        <Box marginLeft={1}>
          <Text color={AGI_THEME.glow}>▴ MORE ABOVE</Text>
        </Box>
      )}

      {visibleSuggestions.map((suggestion, index) => {
        const originalIndex = startIndex + index;
        const isActive = originalIndex === activeIndex;
        const isExpanded = originalIndex === expandedIndex;
        
        const isLong = suggestion.value.length >= MAX_WIDTH;
        const labelElement = (
          <ExpandableText
            label={suggestion.value}
            matchedIndex={suggestion.matchedIndex}
            userInput={userInput}
            textColor={isActive ? AGI_THEME.primary : AGI_THEME.muted}
            isExpanded={isExpanded}
          />
        );

        return (
          <Box key={`${suggestion.value}-${originalIndex}`} flexDirection="row">
            <Box width={2}>
              {isActive && <Text color={AGI_THEME.glow}>{PULSE_DOT}</Text>}
            </Box>
            
            <Box
              {...(mode === 'slash'
                ? { width: commandColumnWidth, flexShrink: 0 as const }
                : { flexShrink: 1 as const })}
            >
              <Box>
                {labelElement}
                {suggestion.commandKind &&
                  COMMAND_KIND_SUFFIX[suggestion.commandKind] && (
                    <Text color={isActive ? AGI_THEME.accent : AGI_THEME.muted}>
                      {COMMAND_KIND_SUFFIX[suggestion.commandKind]}
                    </Text>
                  )}
              </Box>
            </Box>

            {suggestion.description && (
              <Box flexGrow={1} paddingLeft={3}>
                <Text color={isActive ? AGI_THEME.primary : AGI_THEME.muted} wrap="truncate">
                  {sanitizeForDisplay(suggestion.description, 100)}
                </Text>
              </Box>
            )}
            
            {isActive && isLong && (
              <Box width={3} flexShrink={0}>
                <Text color={AGI_THEME.glow}>{isExpanded ? ' ⋘ ' : ' ⋙ '}</Text>
              </Box>
            )}
          </Box>
        );
      })}
      
      {endIndex < suggestions.length && (
        <Box marginLeft={1}>
          <Text color={AGI_THEME.glow}>▾ MORE BELOW</Text>
        </Box>
      )}
      
      {suggestions.length > MAX_SUGGESTIONS_TO_SHOW && (
        <Box alignSelf="flex-end">
          <Text color={AGI_THEME.muted}>
            [{activeIndex + 1}/{suggestions.length}]
          </Text>
        </Box>
      )}
    </Box>
  );
}
