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
      color: sotaPremiumTheme.AccentPurple,
      fontWeight: 'bold',
    },
    'hljs-selector-tag': {
      color: sotaPremiumTheme.AccentPurple,
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: sotaPremiumTheme.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-section': {
      color: sotaPremiumTheme.AccentPurple,
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
      color: sotaPremiumTheme.AccentCyan,
      fontWeight: 'bold',
    },
    'hljs-name': {
      color: sotaPremiumTheme.AccentPurple,
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: sotaPremiumTheme.AccentCyan,
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
      color: sotaPremiumTheme.AccentPurple,
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
);
