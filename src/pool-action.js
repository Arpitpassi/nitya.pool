import { showToast, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';
import { poolDataMap, getCurrentEditPoolId } from './pool-utils.js';
import { loadPools, reloadPoolDetails } from './pool-fetch.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';

export async function sponsorCredits(poolId) {
  try {
    const pool = poolDataMap.get(poolId);
    if (!pool) {
      showToast('Pool data not found.');
      return;
    }
    const endTime = new Date(pool.endTime);
    const currentTime = new Date();
    if (currentTime > endTime) {
      showToast('Pool has ended, cannot sponsor credits.');
      return;
    }
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const password = prompt('Enter the pool password to sponsor credits:');
    if (!password) {
      showToast('Password required to sponsor credits.');
      return;
    }
    const sponsorButton = document.getElementById(`sponsor-btn-${poolId}`);
    if (sponsorButton) {
      sponsorButton.disabled = true;
      sponsorButton.textContent = 'Sponsoring...';
    }
    let successfulShares = 0;
    for (const walletAddress of pool.whitelist) {
      try {
        const response = await fetch(`${serverUrl}/share-credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
          body: JSON.stringify({ eventPoolId: poolId, walletAddress, password })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(`${result.error || 'Failed to sponsor credits'} (${result.code || 'UNKNOWN_ERROR'})`);
        }
        successfulShares++;
      } catch (error) {
        console.error(`Failed to sponsor credits for ${walletAddress}:`, error.message);
        showToast(`Failed to sponsor credits for ${walletAddress}: ${error.message}`);
      }
    }
    if (sponsorButton) {
      sponsorButton.disabled = false;
      sponsorButton.textContent = 'Sponsor Credits';
    }
    showToast(`Sponsored credits to ${successfulShares} of ${pool.whitelist.length} addresses!`, 'success');
    loadPools();
  } catch (error) {
    showToast('Error sponsoring credits: ' + error.message);
    const sponsorButton = document.getElementById(`sponsor-btn-${poolId}`);
    if (sponsorButton) {
      sponsorButton.disabled = false;
      sponsorButton.textContent = 'Sponsor Credits';
    }
  }
}

export async function revokeCredits(poolId) {
  try {
    const pool = poolDataMap.get(poolId);
    if (!pool) {
      showToast('Pool data not found.');
      return;
    }
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const revokeButton = document.getElementById(`revoke-btn-${poolId}`);
    if (revokeButton) {
      revokeButton.disabled = true;
      revokeButton.textContent = 'Revoking...';
    }
    let revokedCount = 0;
    for (const walletAddress of pool.whitelist) {
      const password = prompt(`Enter the pool password to revoke credits for ${walletAddress}:`);
      if (!password) {
        showToast(`Password required to revoke credits for ${walletAddress}.`);
        continue;
      }
      try {
        const url = new URL(`${serverUrl}/pool/${encodeURIComponent(poolId)}/revoke`);
        url.searchParams.append('password', password);
        url.searchParams.append('creatorAddress', walletAddress);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
          body: JSON.stringify({ walletAddress })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(`${result.error || 'Failed to revoke credits'} (${result.code || 'UNKNOWN_ERROR'})`);
        }
        revokedCount++;
      } catch (error) {
        console.error(`Failed to revoke credits for ${walletAddress}:`, error.message);
        showToast(`Failed to revoke credits for ${walletAddress}: ${error.message}`);
      }
    }
    if (revokeButton) {
      revokeButton.disabled = false;
      revokeButton.textContent = 'Revoke Credits';
    }
    showToast(`Revoked credits from ${revokedCount} of ${pool.whitelist.length} addresses!`, 'success');
    loadPools();
  } catch (error) {
    showToast('Error revoking credits: ' + error.message);
    const revokeButton = document.getElementById(`revoke-btn-${poolId}`);
    if (revokeButton) {
      revokeButton.disabled = false;
      revokeButton.textContent = 'Revoke Credits';
    }
  }
}

export async function revokeAccess() {
  const walletAddressInput = document.getElementById('revoke-address').value;
  if (!walletAddressInput) {
    showToast('Please enter an address.');
    return;
  }
  if (!isValidArweaveAddress(walletAddressInput)) {
    showToast('Please enter a valid Arweave address.');
    return;
  }
  if (!getCurrentEditPoolId()) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  const password = prompt('Enter the pool password to revoke access:');
  if (!password) {
    showToast('Password required to revoke access.');
    return;
  }
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const revokeUrl = new URL(`${serverUrl}/pool/${encodeURIComponent(getCurrentEditPoolId())}/revoke`);
    revokeUrl.searchParams.append('password', password);
    revokeUrl.searchParams.append('creatorAddress', walletAddress);
    const revokeResponse = await fetch(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ walletAddress: walletAddressInput })
    });
    const revokeResult = await revokeResponse.json();
    if (!revokeResponse.ok) {
      throw new Error(`${revokeResult.error || 'Failed to revoke access'} (${revokeResult.code || 'UNKNOWN_ERROR'})`);
    }
    const poolResponse = await fetch(`${serverUrl}/pools?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!poolResponse.ok) {
      const errorData = await poolResponse.json();
      throw new Error(`${errorData.error || 'Failed to fetch pool data'} (${errorData.code || 'UNKNOWN_ERROR'})`);
    }
    const pools = await poolResponse.json();
    const pool = pools[getCurrentEditPoolId()];
    if (!pool) {
      throw new Error('Pool data not found after revoking access.');
    }
    const updatedWhitelist = pool.whitelist.filter(addr => addr !== walletAddressInput);
    const updates = { whitelist: updatedWhitelist };
    const editUrl = new URL(`${serverUrl}/pool/${encodeURIComponent(getCurrentEditPoolId())}/edit`);
    editUrl.searchParams.append('password', password);
    editUrl.searchParams.append('creatorAddress', walletAddress);
    const editResponse = await fetch(editUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(updates)
    });
    const editResult = await editResponse.json();
    if (!editResponse.ok) {
      throw new Error(`${editResult.error || 'Failed to update whitelist'} (${editResult.code || 'UNKNOWN_ERROR'})`);
    }
    poolDataMap.set(getCurrentEditPoolId(), { ...pool, whitelist: updatedWhitelist });
    document.getElementById('revoke-address').value = '';
    loadPools();
    reloadPoolDetails(getCurrentEditPoolId());
    showToast('Access revoked and address removed from whitelist successfully!', 'success');
  } catch (error) {
    showToast('Error revoking access or updating whitelist: ' + error.message);
  }
}

export async function shareCredits() {
  const address = document.getElementById('share-address').value;
  if (!address) {
    showToast('Please enter an address.');
    return;
  }
  if (!isValidArweaveAddress(address)) {
    showToast('Please enter a valid Arweave address.');
    return;
  }
  if (!getCurrentEditPoolId()) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  const password = prompt('Enter the pool password to share credits:');
  if (!password) {
    showToast('Password required to share credits.');
    return;
  }
  const serverUrl = document.getElementById('server-url').value;
  if (!serverUrl) {
    showToast('Server URL is missing.');
    return;
  }
  const requestBody = { 
    eventPoolId: getCurrentEditPoolId(), 
    walletAddress: address,
    password
  };
  try {
    const response = await fetch(`${serverUrl}/share-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(requestBody)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`${result.error || 'Failed to share credits'} (${result.code || 'UNKNOWN_ERROR'})`);
    }
    showToast('Credits shared successfully!', 'success');
    document.getElementById('share-address').value = '';
    loadPools();
  } catch (error) {
    showToast('Error sharing credits: ' + error.message);
  }
}

export async function downloadWallet() {
  if (!getCurrentEditPoolId()) {
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
    const url = new URL(`${serverUrl}/pool/${encodeURIComponent(getCurrentEditPoolId())}/wallet`);
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
    a.download = `pool-${getCurrentEditPoolId()}-wallet.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
    showToast('Wallet downloaded successfully!', 'success');
  } catch (error) {
    showToast('Error downloading wallet: ' + error.message);
  }
}

export async function deletePoolConfirm() {
  if (!getCurrentEditPoolId()) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  const confirmDelete = confirm('Are you sure you want to delete this pool? This action cannot be undone.');
  if (confirmDelete) {
    const password = prompt('Enter the pool password to confirm deletion:');
    if (!password) {
      showToast('Password required to delete pool.');
      return;
    }
    try {
      const serverUrl = document.getElementById('server-url').value;
      if (!serverUrl) {
        showToast('Server URL is missing.');
        return;
      }
      const response = await fetch(`${serverUrl}/pool/${encodeURIComponent(getCurrentEditPoolId())}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
        body: JSON.stringify({ 
          password,
          creatorAddress: walletAddress 
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(`${result.error || 'Failed to delete pool'} (${result.code || 'UNKNOWN_ERROR'})`);
      }
      document.getElementById('no-pool-selected').classList.remove('hidden');
      document.getElementById('pool-details').classList.add('hidden');
      loadPools();
      showToast('Pool deleted successfully!', 'success');
    } catch (error) {
      console.error('Delete pool error:', error);
      showToast('Error deleting pool: ' + error.message);
    }
  }
}