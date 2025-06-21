import { showToast } from './utils.js';
import { walletAddress } from './wallet.js';
import { getCurrentEditPoolId, DEPLOY_API_KEY } from './pools.js';

export async function fetchSupportLink() {
  try {
    const response = await fetch(`${document.getElementById('server-url').value}/support-link`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch support link');
    if (result.link) window.open(result.link, '_blank');
    else showToast('No support link configured.');
  } catch (error) {
    showToast('Error fetching support link: ' + error.message);
  }
}

export async function downloadWallet() {
  const currentEditPoolId = getCurrentEditPoolId();
  if (!currentEditPoolId) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  const password = prompt('Enter the pool password to download wallet:');
  if (!password) {
    showToast('Password required to download wallet.');
    return;
  }
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const url = new URL(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}/wallet`);
    url.searchParams.append('password', password);
    url.searchParams.append('creatorAddress', walletAddress);
    const response = await fetch(url, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`${result.error || 'Failed to download wallet'} (${result.code || 'UNKNOWN_ERROR'})`);
    }
    const walletBlob = new Blob([JSON.stringify(result.wallet, null, 2)], { type: 'application/json' });
    const urlObj = URL.createObjectURL(walletBlob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = `pool-${currentEditPoolId}-wallet.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
    showToast('Wallet downloaded successfully!', 'success');
  } catch (error) {
    showToast('Error downloading wallet: ' + error.message);
  }
}