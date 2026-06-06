/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier presence history reuses the shared entity log view for the presence row.
 * - The screen is read-only and only reflects the log stream written by the backend service.
 */

import React from 'react';
import EntityLogPage from '@controleonline/ui-common/src/react/pages/EntityLogPage';

const DeliveryCourierPresenceHistoryContent = EntityLogPage;

export default function DeliveryCourierPresenceHistoryPage(props) {
  return <DeliveryCourierPresenceHistoryContent {...props} />;
}
