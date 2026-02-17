/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { lightTheme, darkTheme, ansiTheme } from './theme.js';

export interface SemanticColors {
  text: {
    primary: string;
    secondary: string;
    link: string;
    accent: string;
    response: string;
    hint: string;
    dim: string;
  };
  input: {
    cursor: string;
    border_active: string;
  };
  suggestions: {
    activeBackground: string;
    activeForeground: string;
  };
  background: {
    primary: string;
    diff: {
      added: string;
      removed: string;
    };
  };
  border: {
    default: string;
    focused: string;
  };
  ui: {
    comment: string;
    symbol: string;
    dark: string;
    gradient: string[] | undefined;
  };
  status: {
    error: string;
    success: string;
    warning: string;
  };
}

export const lightSemanticColors: SemanticColors = {
  text: {
    primary: lightTheme.Foreground,
    secondary: lightTheme.Gray,
    link: lightTheme.AccentBlue,
    accent: lightTheme.AccentPurple,
    response: lightTheme.Foreground,
    hint: lightTheme.Gray,
    dim: lightTheme.DarkGray,
  },
  input: {
    cursor: lightTheme.AccentBlue,
    border_active: lightTheme.AccentBlue,
  },
  suggestions: {
    activeBackground: lightTheme.AccentBlue,
    activeForeground: lightTheme.Background,
  },
  background: {
    primary: lightTheme.Background,
    diff: {
      added: lightTheme.DiffAdded,
      removed: lightTheme.DiffRemoved,
    },
  },
  border: {
    default: lightTheme.Gray,
    focused: lightTheme.AccentBlue,
  },
  ui: {
    comment: lightTheme.Comment,
    symbol: lightTheme.Gray,
    dark: lightTheme.DarkGray,
    gradient: lightTheme.GradientColors,
  },
  status: {
    error: lightTheme.AccentRed,
    success: lightTheme.AccentGreen,
    warning: lightTheme.AccentYellow,
  },
};

export const darkSemanticColors: SemanticColors = {
  text: {
    primary: darkTheme.Foreground,
    secondary: darkTheme.Gray,
    link: darkTheme.AccentBlue,
    accent: darkTheme.AccentPurple,
    response: darkTheme.Foreground,
    hint: darkTheme.Gray,
    dim: darkTheme.DarkGray,
  },
  input: {
    cursor: darkTheme.AccentBlue,
    border_active: darkTheme.AccentBlue,
  },
  suggestions: {
    activeBackground: darkTheme.AccentPurple,
    activeForeground: darkTheme.Background,
  },
  background: {
    primary: darkTheme.Background,
    diff: {
      added: darkTheme.DiffAdded,
      removed: darkTheme.DiffRemoved,
    },
  },
  border: {
    default: darkTheme.Gray,
    focused: darkTheme.AccentBlue,
  },
  ui: {
    comment: darkTheme.Comment,
    symbol: darkTheme.Gray,
    dark: darkTheme.DarkGray,
    gradient: darkTheme.GradientColors,
  },
  status: {
    error: darkTheme.AccentRed,
    success: darkTheme.AccentGreen,
    warning: darkTheme.AccentYellow,
  },
};

export const ansiSemanticColors: SemanticColors = {
  text: {
    primary: ansiTheme.Foreground,
    secondary: ansiTheme.Gray,
    link: ansiTheme.AccentBlue,
    accent: ansiTheme.AccentPurple,
    response: ansiTheme.Foreground,
    hint: ansiTheme.Gray,
    dim: ansiTheme.Gray,
  },
  input: {
    cursor: ansiTheme.AccentBlue,
    border_active: ansiTheme.AccentBlue,
  },
  suggestions: {
    activeBackground: ansiTheme.AccentPurple,
    activeForeground: ansiTheme.Background,
  },
  background: {
    primary: ansiTheme.Background,
    diff: {
      added: ansiTheme.DiffAdded,
      removed: ansiTheme.DiffRemoved,
    },
  },
  border: {
    default: ansiTheme.Gray,
    focused: ansiTheme.AccentBlue,
  },
  ui: {
    comment: ansiTheme.Comment,
    symbol: ansiTheme.Gray,
    dark: ansiTheme.DarkGray,
    gradient: ansiTheme.GradientColors,
  },
  status: {
    error: ansiTheme.AccentRed,
    success: ansiTheme.AccentGreen,
    warning: ansiTheme.AccentYellow,
  },
};
