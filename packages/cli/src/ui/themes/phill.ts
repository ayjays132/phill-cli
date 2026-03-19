/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

const phillColors: ColorsTheme = {
  type: 'dark',
  Background: '#070913', // Deeper midnight base
  Foreground: '#F1F5FF', // Cool bright text
  LightBlue: '#3D61AF', // Deeper light-blue lead
  AccentBlue: '#173B86', // Darker royal blue rail
  AccentPurple: '#7559B9', // Subtle purple secondary
  AccentCyan: '#2F5299', // Blue-biased support (not cyan-neon)
  AccentGreen: '#67F3A9', // Neon light green accent
  AccentYellow: '#FFC94A', // Soft Amber Warning
  AccentRed: '#E15A5A', // Balanced crimson
  DiffAdded: '#1D4A36', // Dark green diff
  DiffRemoved: '#7A1F1F', // Deep Crimson (readable in diff blocks)
  Comment: '#8A90B8', // Blue-violet neutral
  Gray: '#9097C2',
  DarkGray: '#181D2B',
  GradientColors: ['#173B86', '#7559B9', '#67F3A9'], // 30/30/30 deep blue -> purple -> neon green
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
      color: '#456AB4', // Deep blue primary
      fontWeight: 'bold',
    },
    'hljs-selector-tag': {
      color: '#456AB4',
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: '#4A6FB8',
      fontWeight: 'bold',
    },
    'hljs-section': {
      color: '#7458B8', // Purple secondary
      fontWeight: 'bold',
    },
    'hljs-link': {
      color: '#4A6FB8',
    },
    'hljs-function .hljs-keyword': {
      color: '#4166AE',
    },
    'hljs-subst': {
      color: phillColors.Foreground,
    },
    'hljs-string': {
      color: '#67F3A9', // Neon light green
    },
    'hljs-title': {
      color: '#456AB4',
      fontWeight: 'bold',
    },
    'hljs-name': {
      color: '#456AB4',
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: '#456AB4',
      fontWeight: 'bold',
    },
    'hljs-attribute': {
      color: '#4A6FB8',
    },
    'hljs-symbol': {
      color: '#4166AE',
    },
    'hljs-bullet': {
      color: '#4166AE',
    },
    'hljs-number': {
      color: '#70F0A7',
    },
    'hljs-regexp': {
      color: '#4C8A69',
    },
    'hljs-built_in': {
      color: '#4D72BC', // Deep-blue built-ins
    },
    'hljs-params': {
      color: '#D7D0E8',
    },
    'hljs-operator': {
      color: '#466BB4', // Blue operator visibility
    },
    'hljs-addition': {
      color: phillColors.AccentGreen,
    },
    'hljs-variable': {
      color: phillColors.Foreground,
    },
    'hljs-template-tag': {
      color: '#70F4AA',
    },
    'hljs-template-variable': {
      color: '#70F4AA',
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
  {
    text: {
      primary: phillColors.Foreground,
      secondary: '#97A5D2',
      link: phillColors.AccentCyan,
      accent: phillColors.AccentGreen,
      response: phillColors.Foreground,
      hint: '#77DAB3',
      dim: '#1A2237',
    },
    input: {
      cursor: phillColors.AccentGreen,
      border_active: phillColors.AccentGreen,
    },
    suggestions: {
      activeBackground: '#192743',
      activeForeground: phillColors.Background,
    },
    background: {
      primary: phillColors.Background,
      diff: {
        added: phillColors.DiffAdded,
        removed: phillColors.DiffRemoved,
      },
    },
    border: {
      default: '#2D4578',
      focused: phillColors.AccentGreen,
      subtle: '#312D4B',
      accent: '#6A52AA',
      strong: '#67F3A9',
    },
    ui: {
      comment: phillColors.Comment,
      symbol: phillColors.AccentGreen,
      dark: phillColors.DarkGray,
      gradient: phillColors.GradientColors,
    },
    status: {
      error: phillColors.AccentRed,
      success: phillColors.AccentGreen,
      warning: phillColors.AccentYellow,
    },
  },
);
