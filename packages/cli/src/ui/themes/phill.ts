/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

const phillColors: ColorsTheme = {
  type: 'dark',
  Background: '#0D0D0D', // Obsidian (Deeper, more premium)
  Foreground: '#F2F6F2', // Soft Pearl (higher clarity on dark backgrounds)
  LightBlue: '#8FBC8F', // SeaGreen (Subtle)
  AccentBlue: '#2BC7BE', // Refined Aqua (cleaner contrast)
  AccentPurple: '#3CD45A', // Signature Green Accent
  AccentCyan: '#44E7F2', // Premium Cyan (less glare, still vivid)
  AccentGreen: '#B7FF4A', // Refined Lime
  AccentYellow: '#FFC94A', // Soft Amber Warning
  AccentRed: '#FF4500', // OrangeRed (More vibrant)
  DiffAdded: '#0D5F2D', // Deep Green (readable in diff blocks)
  DiffRemoved: '#7A1F1F', // Deep Crimson (readable in diff blocks)
  Comment: '#6D756E', // Muted Sage Gray (better legibility)
  Gray: '#8B948E',
  DarkGray: '#171A17',
  GradientColors: ['#B7FF4A', '#3CD45A'], // Premium Lime to Signature Green
};

export const PhillTheme: Theme = new Theme(
  'Phill',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: phillColors.Background,
      color: phillColors.Foreground,
    },
    'hljs-keyword': {
      color: '#ADFF2F', // Lime
      fontWeight: 'bold',
    },
    'hljs-selector-tag': {
      color: '#ADFF2F',
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: '#CCFF00', // Electric Lime
      fontWeight: 'bold',
    },
    'hljs-section': {
      color: '#ADFF2F',
      fontWeight: 'bold',
    },
    'hljs-link': {
      color: '#00FA9A', // Spring Green
    },
    'hljs-function .hljs-keyword': {
      color: '#32CD32', // Lime Green
    },
    'hljs-subst': {
      color: phillColors.Foreground,
    },
    'hljs-string': {
      color: '#228B22', // Forest Green
    },
    'hljs-title': {
      color: '#ADFF2F', // Lime
      fontWeight: 'bold',
    },
    'hljs-name': {
      color: '#ADFF2F',
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: '#ADFF2F',
      fontWeight: 'bold',
    },
    'hljs-attribute': {
      color: '#00FA9A', // Spring Green
    },
    'hljs-symbol': {
      color: '#32CD32', // Lime Green
    },
    'hljs-bullet': {
      color: '#ADFF2F', // Lime
    },
    'hljs-number': {
      color: '#D7FF7A', // Bright Lime Number
    },
    'hljs-regexp': {
      color: '#5FE39D', // Mint Green Pattern
    },
    'hljs-built_in': {
      color: '#62E6D8', // Cool Aqua Built-ins
    },
    'hljs-params': {
      color: '#CDEFD2', // Soft Parameter Tint
    },
    'hljs-operator': {
      color: '#8DE8F0', // Crisp operator visibility
    },
    'hljs-addition': {
      color: phillColors.AccentGreen,
    },
    'hljs-variable': {
      color: phillColors.Foreground,
    },
    'hljs-template-tag': {
      color: '#ADFF2F',
    },
    'hljs-template-variable': {
      color: '#ADFF2F',
    },
    'hljs-comment': {
      color: phillColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: phillColors.Comment,
    },
    'hljs-deletion': {
      color: phillColors.AccentRed,
    },
    'hljs-meta': {
      color: phillColors.Comment,
    },
    'hljs-doctag': {
      fontWeight: 'bold',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
  },
  phillColors,
);

