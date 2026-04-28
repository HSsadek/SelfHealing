import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { UrlProvider } from './contexts/UrlContext';
import ErrorBoundary from './components/ErrorBoundary';
import { router } from './routes/index.jsx';
import './index.css';

/**
 * App root — SocketProvider here makes the socket available across ALL
 * dashboard child routes (healing, tests) without re-connecting on navigation.
 */
function App() {
    return (
        <ErrorBoundary>
            <UrlProvider>
                <SocketProvider>
                    <RouterProvider router={router} />
                </SocketProvider>
            </UrlProvider>
        </ErrorBoundary>
    );
}

export default App;
