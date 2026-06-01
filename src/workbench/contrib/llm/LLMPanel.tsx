/**
 * LLM Panel — wrapper, delegates to AIChatPanel.
 */

import React from 'react';
import { AIChatPanel } from './AIChatPanel';

export const LLMPanel: React.FC = () => {
  return <AIChatPanel />;
};
