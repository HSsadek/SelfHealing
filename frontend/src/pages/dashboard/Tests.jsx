import React, { memo } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { SocketProvider } from '../../contexts/SocketContext';
import QADashboard from '../../components/QADashboard';

/**
 * Tests page — wraps the full QA Dashboard with its own SocketProvider
 * so the socket lifecycle is scoped to this route only.
 */
const Tests = () => (
    <SocketProvider>
        <QADashboard />
    </SocketProvider>
);

export default Tests;
