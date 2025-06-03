import { showToast } from './utils.js';
import { loadPools } from './pool.js';

export let walletAddress = null;

export async function connectWallet() {
  try {
    if (window.arweaveWallet) {
      await window.arweaveWallet.connect(['ACCESS_ADDRESS']);
      walletAddress = await window.arweaveWallet.getActiveAddress();
      document.getElementById('wallet-status').textContent = `Connected: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
      document.getElementById('connect-wallet').classList.add('hidden');
      document.getElementById('disconnect-wallet').classList.remove('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadPools();
    } else {
      showToast('Arweave Wallet extension not detected.');
    }
  } catch (error) {
    showToast('Error connecting wallet: ' + error.message);
  }
}

export async function disconnectWallet() {
  try {
    if (window.arweaveWallet) await window.arweaveWallet.disconnect();
    walletAddress = null;
    document.getElementById('wallet-status').textContent = 'Connect your Arweave wallet to continue';
    document.getElementById('connect-wallet').classList.remove('hidden');
    document.getElementById('disconnect-wallet').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  } catch (error) {
    showToast('Error disconnecting wallet: ' + error.message);
  }
}