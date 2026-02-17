/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserService, Config } from 'phill-cli-core';

export function useBrowserStatus(config: Config) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const browserService = BrowserService.getInstance(config);

    // Initial state
    setIsOpen(browserService.isBrowserOpen());
    setUrl(browserService.getCurrentUrl());

    const onStart = () => setIsOpen(true);
    const onStop = () => { setIsOpen(false); setUrl(null); };
    const onNav = (newUrl: string) => setUrl(newUrl);

    browserService.on('browser-started', onStart);
    browserService.on('browser-stopped', onStop);
    browserService.on('navigation', onNav);

    return () => {
      browserService.off('browser-started', onStart);
      browserService.off('browser-stopped', onStop);
      browserService.off('navigation', onNav);
    };
  }, [config]);

  return { isOpen, url };
}
