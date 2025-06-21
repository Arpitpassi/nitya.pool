import { showToast, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';
import { loadPools } from './poolLoading.js';
import { reloadPoolDetails } from './poolDetails.js';
import { getCurrentEditPoolId, getPoolDataMap, DEPLOY_API_KEY } from './pools.js';

export async function sponsorCredits(poolId) {
  try {
    const poolDataMap = getPoolDataMap();
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
    const poolDataMap = getPoolDataMap();
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
  const currentEditPoolId = getCurrentEditPoolId();
  if (!currentEditPoolId) {
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
    // Step 1: Revoke access
    const revokeUrl = new URL(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}/revoke`);
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
    // Step 2: Fetch current pool data to get the latest whitelist
    const poolResponse = await fetch(`${serverUrl}/pools?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!poolResponse.ok) {
      const errorData = await poolResponse.json();
      throw new Error(`${errorData.error || 'Failed to fetch pool data'} (${errorData.code || 'UNKNOWN_ERROR'})`);
    }
    const pools = await poolResponse.json();
    const pool = pools[currentEditPoolId];
    if (!pool) {
      throw new Error('Pool data not found after revoking access.');
    }
    // Step 3: Update whitelist by removing the revoked address
    const updatedWhitelist = pool.whitelist.filter(addr => addr !== walletAddressInput);
    const updates = { whitelist: updatedWhitelist };
    const editUrl = new URL(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}/edit`);
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
    // Step 4: Update local poolDataMap
    const poolDataMap = getPoolDataMap();
    poolDataMap.set(currentEditPoolId, { ...pool, whitelist: updatedWhitelist });
    // Step 5: Clear input and refresh UI
    document.getElementById('revoke-address').value = '';
    loadPools();
    reloadPoolDetails(currentEditPoolId);
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
  const currentEditPoolId = getCurrentEditPoolId();
  if (!currentEditPoolId) {
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
    eventPoolId: currentEditPoolId, 
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