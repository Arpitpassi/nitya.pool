import { showToast } from './utils.js';
import { loadPools } from './pool.js';
import BrowserWalletStrategy from '@arweave-wallet-kit/browser-wallet-strategy';
import AoSyncStrategy from '@vela-ventures/aosync-strategy';

// Initialize strategies globally
export const browserWalletStrategy = new BrowserWalletStrategy();
export const beaconStrategy = new AoSyncStrategy();
let activeStrategy = null;
export let walletAddress = null;

export function showWalletChoiceModal() {
  const modal = document.getElementById('wallet-choice-modal');
  if (modal) {
    modal.classList.remove('hidden');
  } else {
    console.error('Wallet choice modal not found in DOM');
    showToast('Error: Wallet selection modal not found');
  }
}

export async function connectWithStrategy(strategy) {
  try {
    console.log(`Attempting to connect with strategy: ${strategy.constructor.name}`);
    await strategy.connect(['ACCESS_ADDRESS']);
    walletAddress = await strategy.getActiveAddress();
    console.log(`Connected wallet address: ${walletAddress}`);
    activeStrategy = strategy;
    document.getElementById('wallet-status').textContent = `Connected: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
    document.getElementById('wallet-choice-modal').classList.add('hidden');
    document.getElementById('connect-wallet').classList.add('hidden');
    document.getElementById('disconnect-wallet').classList.remove('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    await loadPools();
  } catch (error) {
    console.error('Wallet connection error:', error);
    showToast(`Error connecting wallet: ${error.message}`);
  }
}

export async function disconnectWallet() {
  if (activeStrategy) {
    try {
      console.log('Disconnecting wallet');
      await activeStrategy.disconnect();
      activeStrategy = null;
      walletAddress = null;
      document.getElementById('wallet-status').textContent = 'Connect your Arweave wallet to continue';
      document.getElementById('connect-wallet').classList.remove('hidden');
      document.getElementById('disconnect-wallet').classList.add('hidden');
      document.getElementById('dashboard').classList.add('hidden');
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      showToast(`Error disconnecting wallet: ${error.message}`);
    }
  } else {
    console.warn('No active strategy to disconnect');
  }
}