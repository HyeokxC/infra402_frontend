import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import MainLayout from './components/layout/MainLayout';
import ChatPage from './pages/ChatPage';
import ServersPage from './pages/ServersPage';
import ContainersPage from './pages/ContainersPage';


// Wrapper component to handle global logic like auto-connect
const AppContent = () => {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const isInMiniApp = typeof window !== 'undefined' && window.parent !== window;

  // Auto-connect wallet logic
  useEffect(() => {
    if (isInMiniApp) {
      console.log('Running in Base MiniApp - skipping auto-connect');
      return;
    }

    if (!isConnected && connectors.length > 0) {
      const coinbaseConnector = connectors.find(
        (connector) => connector.id === 'coinbaseWalletSDK'
      );
      if (coinbaseConnector) {
        // Attempt to connect transparently if possible, or trigger the modal logic
        // Since we want " 들어가자마자 지갑 팝업" (Popup immediately on entry), 
        // we can try connecting which usually prompts the user if not authorized.
        connect({ connector: coinbaseConnector });
      }
    }
  }, [isConnected, connectors, connect, isInMiniApp]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<ChatPage />} />
        <Route path="servers" element={<ServersPage />} />
        <Route path="containers" element={<ContainersPage />} />
      </Route>
    </Routes>
  );
};

// Global Wallet Button for the top-right corner of the layout
// We can use a Portal or just place it in the Layout. 
// Ideally, the Layout should include the Header with the Wallet button.
// Let's modify MainLayout to include a header or floating wallet button?
// Or we can rely on the Sidebar?
// The user request said "server, memory, containers > sidebar".
// It didn't explicitly place the wallet. Common pattern: Top Right.

function App() {
  return (
    <BrowserRouter>
      <AppContent />

      {/* Absolute positioned Wallet Button for global access */}

    </BrowserRouter>
  );
}

export default App;
