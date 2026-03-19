/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { sotaPremiumTheme, Theme } from './theme.js';

export const SOTAPremium: Theme = new Theme(
  'SOTA Premium',
  'custom',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: sotaPremiumTheme.Background,
      color: sotaPremiumTheme.Foreground,
    },
    'hljs-keyword': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-selector-tag': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-section': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-link': {
      color: sotaPremiumTheme.LightBlue,
      textDecoration: 'underline',
    },
    'hljs-subst': {
      color: sotaPremiumTheme.Foreground,
    },
    'hljs-string': {
      color: sotaPremiumTheme.AccentYellow,
    },
    'hljs-title': {
      color: sotaPremiumTheme.LightBlue,
      fontWeight: 'bold',
    },
    'hljs-name': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: sotaPremiumTheme.LightBlue,
    },
    'hljs-number': {
      color: sotaPremiumTheme.AccentGreen,
    },
    'hljs-regexp': {
      color: sotaPremiumTheme.AccentRed,
    },
    'hljs-built_in': {
      color: sotaPremiumTheme.AccentBlue,
    },
    'hljs-variable': {
      color: sotaPremiumTheme.LightBlue,
    },
    'hljs-comment': {
      color: sotaPremiumTheme.Comment,
      fontStyle: 'italic',
    },
    'hljs-deletion': {
      color: sotaPremiumTheme.AccentRed,
    },
    'hljs-addition': {
      color: sotaPremiumTheme.AccentGreen,
    },
  },
  sotaPremiumTheme,
  {
    text: {
      primary: sotaPremiumTheme.Foreground,
      secondary: '#8FA6DA', // Deeper blue secondary
      link: sotaPremiumTheme.LightBlue,
      accent: sotaPremiumTheme.AccentGreen,
      response: sotaPremiumTheme.Foreground,
      hint: '#9A83E0', // Purple hint layer
      dim: '#1D2336', // Dark blue dim base
    },
    input: {
      cursor: sotaPremiumTheme.AccentGreen,
      border_active: sotaPremiumTheme.AccentGreen,
    },
    suggestions: {
      activeBackground: '#182745', // Deeper blue suggestion rail
      activeForeground: sotaPremiumTheme.Background,
    },
    background: {
      primary: sotaPremiumTheme.Background,
      diff: {
        added: sotaPremiumTheme.DiffAdded,
        removed: sotaPremiumTheme.DiffRemoved,
      },
    },
    border: {
      default: '#2C4578', // Deep-blue rail
      focused: sotaPremiumTheme.AccentGreen, // Neon-light-green focus
      subtle: '#2A2F4A', // Indigo shadow layer
      accent: '#654FA2', // Muted purple accent rail
      strong: '#66F2A4', // Neon strong rail
    },
    ui: {
      comment: sotaPremiumTheme.Comment,
      symbol: sotaPremiumTheme.AccentBlue, // Blue-leading symbols
      dark: sotaPremiumTheme.DarkGray,
      gradient: sotaPremiumTheme.GradientColors,
    },
    status: {
      error: sotaPremiumTheme.AccentRed,
      success: sotaPremiumTheme.AccentGreen,
      warning: sotaPremiumTheme.AccentYellow,
    },
  },
);
