/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Text, type TextProps } from 'ink';
import Gradient from 'ink-gradient';
import { theme } from '../semantic-colors.js';

interface ThemedGradientProps extends TextProps {
  /**
   * If true, animates the gradient by shifting the colors.
   */
  animate?: boolean;
  /**
   * Animation speed in milliseconds per frame.
   */
  speed?: number;
}

export const ThemedGradient: React.FC<ThemedGradientProps> = ({ 
  children, 
  animate = false,
  speed = 100,
  ...props 
}) => {
  const gradient = theme.ui.gradient;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!animate || !gradient || gradient.length < 2) return;

    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % gradient.length);
    }, speed);

    return () => clearInterval(interval);
  }, [animate, gradient, speed]);

  if (gradient && gradient.length >= 2) {
    // Shift the colors array based on the offset to create a flowing animation
    const activeGradient = animate 
      ? [...gradient.slice(offset), ...gradient.slice(0, offset)]
      : gradient;

    return (
      <Gradient colors={activeGradient}>
        <Text {...props}>{children}</Text>
      </Gradient>
    );
  }

  if (gradient && gradient.length === 1) {
    return (
      <Text color={gradient[0]} {...props}>
        {children}
      </Text>
    );
  }

  // Fallback to accent color if no gradient
  return (
    <Text color={theme.text.accent} {...props}>
      {children}
    </Text>
  );
};
