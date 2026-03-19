/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Spinner from 'ink-spinner';
import { type ComponentProps, useEffect } from 'react';
import { debugState } from '../debug.js';
import { useSettings } from '../contexts/SettingsContext.js';

export type SpinnerProps = ComponentProps<typeof Spinner>;

export const CliSpinner = (props: SpinnerProps) => {
  const settings = useSettings();
  const shouldShow = settings.merged.ui?.showSpinner !== false;

  useEffect(() => {
    if (shouldShow) {
      debugState.debugNumAnimatedComponents++;
      return () => {
        debugState.debugNumAnimatedComponents--;
      };
    }
    return undefined;
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  // Use a premium spinner type ('bounce' or 'aesthetic' usually look great)
  // We'll use the 'bounce' spinner for a fluid OS feel.
  return <Spinner type="bounce" {...props} />;
};
