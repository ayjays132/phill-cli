/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { OperatorLatentSync, Config } from 'phill-cli-core';

export function useOperatorStatus(config: Config) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const latentSync = OperatorLatentSync.getInstance(config);

    // Sync state periodically from the service as it might not emit for every single tick
    // but definitely emits on state change.
    const updateState = () => setIsActive(latentSync.isSyncActive());
    
    // Check initially
    updateState();

    const onStateChange = () => updateState();
    
    // We can also listen for 'stateChange' events if we want to show the current latent
    latentSync.on('stateChange', onStateChange);
    
    // Since start/stop might not emit a specific event, we can poll lightly or rely on 
    // the fact that most start/stops are triggered by tools.
    const pollInterval = setInterval(updateState, 2000);

    return () => {
      latentSync.off('stateChange', onStateChange);
      clearInterval(pollInterval);
    };
  }, [config]);

  return { isActive };
}
