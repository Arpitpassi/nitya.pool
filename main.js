const DEPLOY_API_KEY = 'deploy-api-key-123';
let walletAddress = null;
let currentEditPoolId = null;
let poolDataMap = new Map();

function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function localToZulu(localDateTime) {
  return new Date(localDateTime).toISOString();
}

function zuluToLocal(zuluString) {
  const date = new Date(zuluString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDisplayTime(zuluString) {
  return new Date(zuluString).toLocaleString();
}

function isValidArweaveAddress(address) {
  return /^[a-zA-Z0-9_-]{43}$/.test(address.trim());
}

function updateWhitelistPreview(textareaId, previewId) {
  const textarea = document.getElementById(textareaId);
  const preview = document.getElementById(previewId);
  const addresses = textarea.value.split('\n').map(a => a.trim()).filter(a => a);
  preview.innerHTML = addresses.map((address) => `
    <div class="p-2 bg-gray-100 rounded text-sm ${isValidArweaveAddress(address) ? 'text-green-600' : 'text-red-600'}">
      <span class="break-all">${address}</span>
    </div>
  `).join('');
}

document.getElementById('whitelist').addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
document.getElementById('edit-whitelist').addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));

document.getElementById('connect-wallet').addEventListener('click', async () => {
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
});

document.getElementById('disconnect-wallet').addEventListener('click', async () => {
  try {
    if (window.arweaveWallet) await window.arweaveWallet.disconnect();
    walletAddress = null;
    poolDataMap.clear();
    document.getElementById('wallet-status').textContent = 'Connect your Arweave wallet to continue';
    document.getElementById('connect-wallet').classList.remove('hidden');
    document.getElementById('disconnect-wallet').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  } catch (error) {
    showToast('Error disconnecting wallet: ' + error.message);
  }
});

document.getElementById('support-btn').addEventListener('click', async () => {
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
});

document.getElementById('create-pool-btn').addEventListener('click', () => {
  document.getElementById('create-modal').classList.remove('hidden');
  updateWhitelistPreview('whitelist', 'whitelist-preview-create');
});

document.getElementById('cancel-create').addEventListener('click', () => {
  document.getElementById('create-modal').classList.add('hidden');
  document.getElementById('whitelist-preview-create').innerHTML = '';
});

document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
  document.getElementById('whitelist-preview-edit').innerHTML = '';
});

document.getElementById('close-details').addEventListener('click', () => {
  document.getElementById('details-modal').classList.add('hidden');
});

document.getElementById('create-pool-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const poolPassword = document.getElementById('pool-password').value;
  if (!poolPassword) {
    showToast('Pool password is required.');
    return;
  }
  
  const addresses = document.getElementById('whitelist').value.split('\n').map(a => a.trim()).filter(a => a);
  const invalidAddresses = addresses.filter(a => !isValidArweaveAddress(a));
  if (invalidAddresses.length > 0) {
    showToast('Please fix invalid addresses: ' + invalidAddresses.join(', '));
    return;
  }
  const startTime = new Date(document.getElementById('start-time').value);
  const endTime = new Date(document.getElementById('end-time').value);
  if (startTime >= endTime) {
    showToast('Start time must be before end time.');
    return;
  }
  
  const poolData = {
    name: document.getElementById('pool-name').value,
    password: poolPassword,
    startTime: localToZulu(document.getElementById('start-time').value),
    endTime: localToZulu(document.getElementById('end-time').value),
    usageCap: parseFloat(document.getElementById('usage-cap').value),
    whitelist: addresses,
    creatorAddress: walletAddress,
    sponsorInfo: document.getElementById('sponsor-info').value
  };
  
  try {
    const response = await fetch(`${document.getElementById('server-url').value}/create-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(poolData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`${result.error || 'Failed to create pool'} (${result.code || 'UNKNOWN_ERROR'})`);
    }
    document.getElementById('create-modal').classList.add('hidden');
    document.getElementById('create-pool-form').reset();
    document.getElementById('whitelist-preview-create').innerHTML = '';
    loadPools();
    showToast('Pool created successfully!', 'success');
  } catch (error) {
    showToast('Error creating pool: ' + error.message);
  }
});

document.getElementById('edit-pool-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const poolPassword = document.getElementById('edit-pool-password').value;
  if (!poolPassword) {
    showToast('Pool password is required to edit.');
    return;
  }
  
  const addresses = document.getElementById('edit-whitelist').value.split('\n').map(a => a.trim()).filter(a => a);
  const invalidAddresses = addresses.filter(a => !isValidArweaveAddress(a));
  if (invalidAddresses.length > 0) {
    showToast('Please fix invalid addresses: ' + invalidAddresses.join(', '));
    return;
  }
  const startTime = document.getElementById('edit-start-time').value ? new Date(document.getElementById('edit-start-time').value) : null;
  const endTime = document.getElementById('edit-end-time').value ? new Date(document.getElementById('edit-end-time').value) : null;
  if (startTime && endTime && startTime >= endTime) {
    showToast('Start time must be before end time.');
    return;
  }
  
  const updates = {};
  const editStartTime = document.getElementById('edit-start-time').value;
  const editEndTime = document.getElementById('edit-end-time').value;
  const editUsageCap = document.getElementById('edit-usage-cap').value;
  const editWhitelist = document.getElementById('edit-whitelist').value;
  
  if (editStartTime) updates.startTime = localToZulu(editStartTime);
  if (editEndTime) updates.endTime = localToZulu(editEndTime);
  if (editUsageCap) updates.usageCap = parseFloat(editUsageCap);
  if (editWhitelist) updates.whitelist = addresses;
  
  console.log('Edit pool request body:', updates);
  
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const url = new URL(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}/edit`);
    url.searchParams.append('password', poolPassword);
    url.searchParams.append('creatorAddress', walletAddress);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(updates)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`${result.error || 'Failed to update pool'} (${result.code || 'UNKNOWN_ERROR'})`);
    }
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('whitelist-preview-edit').innerHTML = '';
    document.getElementById('edit-pool-form').reset();
    loadPools();
    showToast('Pool updated successfully!', 'success');
  } catch (error) {
    showToast('Error updating pool: ' + error.message);
  }
});

async function sponsorCredits(poolId) {
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
    
    // Prompt for password
    const password = prompt('Enter the pool password to sponsor credits:');
    if (!password) {
      showToast('Password required to sponsor credits.');
      return;
    }
    
    // Show loading state
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
          body: JSON.stringify({ eventPoolId: poolId, walletAddress })
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
    
    // Reset button state
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

async function revokeCredits(poolId) {
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
    
    // Prompt for password
    const password = prompt('Enter the pool password to revoke credits:');
    if (!password) {
      showToast('Password required to revoke credits.');
      return;
    }
    
    // Show loading state
    const revokeButton = document.getElementById(`revoke-btn-${poolId}`);
    if (revokeButton) {
      revokeButton.disabled = true;
      revokeButton.textContent = 'Revoking...';
    }
    
    let revokedCount = 0;
    for (const walletAddress of pool.whitelist) {
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
    
    // Reset button state
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

window.revokeAccess = async () => {
  const walletAddressInput = document.getElementById('revoke-address').value;
  const password = document.getElementById('revoke-password').value;
  
  if (!walletAddressInput || !password) {
    showToast('Please enter both address and password.');
    return;
  }
  
  if (!isValidArweaveAddress(walletAddressInput)) {
    showToast('Please enter a valid Arweave address.');
    return;
  }
  
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const url = new URL(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}/revoke`);
    url.searchParams.append('password', password);
    url.searchParams.append('creatorAddress', walletAddress);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ walletAddress: walletAddressInput })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`${result.error || 'Failed to revoke access'} (${result.code || 'UNKNOWN_ERROR'})`);
    }
    showToast('Access revoked successfully!', 'success');
    document.getElementById('revoke-address').value = '';
    document.getElementById('revoke-password').value = '';
    loadPools();
  } catch (error) {
    showToast('Error revoking access: ' + error.message);
  }
};

window.shareCredits = async () => {
  const address = document.getElementById('share-address').value;
  
  if (!address) {
    showToast('Please enter an address.');
    return;
  }
  
  if (!isValidArweaveAddress(address)) {
    showToast('Please enter a valid Arweave address.');
    return;
  }
  
  if (!currentEditPoolId) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  
  const serverUrl = document.getElementById('server-url').value;
  if (!serverUrl) {
    showToast('Server URL is missing.');
    return;
  }
  
  const requestBody = { 
    eventPoolId: currentEditPoolId, 
    walletAddress: address
  };
  
  console.log('Share credits request:', requestBody);
  
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
};

window.downloadWallet = async () => {
  const password = document.getElementById('download-password').value;
  
  if (!password) {
    showToast('Please enter the pool password.');
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
    document.getElementById('download-password').value = '';
  } catch (error) {
    showToast('Error downloading wallet: ' + error.message);
  }
};

window.deletePoolConfirm = async () => {
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
      const response = await fetch(`${serverUrl}/pool/${encodeURIComponent(currentEditPoolId)}`, {
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
      document.getElementById('details-modal').classList.add('hidden');
      loadPools();
      showToast('Pool deleted successfully!', 'success');
    } catch (error) {
      showToast('Error deleting pool: ' + error.message);
    }
  }
};

window.editPool = (poolId) => {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  currentEditPoolId = poolId;
  document.getElementById('edit-start-time').value = zuluToLocal(pool.startTime);
  document.getElementById('edit-end-time').value = zuluToLocal(pool.endTime);
  document.getElementById('edit-usage-cap').value = pool.usageCap;
  document.getElementById('edit-whitelist').value = pool.whitelist.join('\n');
  document.getElementById('edit-pool-password').value = '';
  document.getElementById('edit-modal').classList.remove('hidden');
  updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit');
};

window.viewDetails = async (poolId) => {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  currentEditPoolId = poolId;
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const balanceResponse = await fetch(`${serverUrl}/pool/${encodeURIComponent(poolId)}/balance?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: { balance: 0 } };
    const balance = balanceData.balance || { balance: 0 };
    const now = new Date();
    const endTime = new Date(pool.endTime);
    const isEnded = now > endTime;
    const statusText = isEnded ? 'Ended' : 'Active';
    const statusColor = isEnded ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100';
    const detailsContent = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-6">
          <div class="pool-details-section rounded-2xl p-6 bg-white shadow">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Pool Information</h4>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">Name:</span>
                <span class="font-semibold">${pool.name}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">Status:</span>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColor}">${statusText}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-gray-600 font-medium">Pool ID:</span>
                <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">${poolId}</span>
              </div>
            </div>
          </div>
          <div class="pool-details-section rounded-2xl p-6 bg-white shadow">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Time & Usage</h4>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">Start Time:</span>
                <span class="font-semibold">${formatDisplayTime(pool.startTime)}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">End Time:</span>
                <span class="font-semibold">${formatDisplayTime(pool.endTime)}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">Usage Cap:</span>
                <span class="font-semibold">${pool.usageCap} Credits</span>
              </div>
            </div>
          </div>
          <div class="pool-details-section rounded-2xl p-6 bg-white shadow">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Wallet Balance</h4>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2">
                <span class="text-gray-600 font-medium">Current Balance:</span>
                <span class="font-bold text-2xl text-blue-600">${(balance.balance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div class="pool-details-section rounded-2xl p-6 bg-white shadow">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Actions</h4>
            <button id="sponsor-btn-${poolId}" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-all mb-2">Sponsor whitelist Credits</button>
            <button id="revoke-btn-${poolId}" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Revoke Credits</button>
          </div>
        </div>
        <div class="space-y-6">
          <div class="pool-details-section rounded-2xl p-6 bg-white shadow">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Whitelisted Addresses (${pool.whitelist.length})</h4>
            <div class="max-h-80 overflow-y-auto space-y-2">
              ${pool.whitelist.map(address => `
                <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span class="text-xs font-mono text-gray-700 break-all">${address}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    
    // Add event listeners to buttons
    const sponsorButton = document.getElementById(`sponsor-btn-${poolId}`);
    const revokeButton = document.getElementById(`revoke-btn-${poolId}`);
    if (sponsorButton) {
      sponsorButton.addEventListener('click', () => sponsorCredits(poolId));
    }
    if (revokeButton) {
      revokeButton.addEventListener('click', () => revokeCredits(poolId));
    }
    
    document.getElementById('details-modal').classList.remove('hidden');
  } catch (error) {
    showToast('Error loading pool details: ' + error.message);
  }
};

async function loadPools() {
  const poolsGrid = document.getElementById('pools-grid');
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const response = await fetch(`${serverUrl}/pools?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${errorData.error || 'Failed to fetch pools'} (${errorData.code || 'UNKNOWN_ERROR'})`);
    }
    const pools = await response.json();
    poolDataMap.clear();
    poolsGrid.innerHTML = '';
    let totalPools = 0, activePools = 0;
    for (const [poolId, pool] of Object.entries(pools)) {
      poolDataMap.set(poolId, pool);
      totalPools++;
      const balanceResponse = await fetch(`${serverUrl}/pool/${encodeURIComponent(poolId)}/balance?creatorAddress=${encodeURIComponent(walletAddress)}`, {
        headers: { 'X-API-Key': DEPLOY_API_KEY }
      });
      const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: { balance: 0 } };
      const balance = balanceData.balance || { balance: 0 };
      const now = new Date();
      const endTime = new Date(pool.endTime);
      const isEnded = now > endTime;
      if (!isEnded) activePools++;
      const statusColor = isEnded ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
      const statusText = isEnded ? 'Ended' : 'Active';
      const poolCard = document.createElement('div');
      poolCard.className = 'pool-card p-6 bg-white shadow rounded-2xl';
      poolCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900">${pool.name}</h3>
          <span class="px-3 py-1 rounded-lg text-xs font-semibold ${statusColor}">${statusText}</span>
        </div>
        <div class="space-y-3 text-sm text-gray-600 mb-6">
          <div class="flex justify-between">
            <span>Balance:</span>
            <span class="font-semibold">${(balance.balance || 0).toFixed(4)}</span>
          </div>
          <div class="flex justify-between">
            <span>Usage Cap:</span>
            <span class="font-semibold">${pool.usageCap}</span>
          </div>
          <div class="flex justify-between">
            <span>Duration:</span>
            <span class="text-xs">${formatDisplayTime(pool.startTime)} - ${formatDisplayTime(pool.endTime)}</span>
          </div>
          <div class="flex justify-between">
            <span>Addresses:</span>
            <span class="font-semibold">${pool.whitelist.length}</span>
          </div>
        </div>
        <div class="space-y-2">
          <button onclick="viewDetails('${poolId}')" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">View Details</button>
          ${!isEnded ? `<button onclick="editPool('${poolId}')" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Edit Pool</button>` : ''}
        </div>
      `;
      poolsGrid.appendChild(poolCard);
    }
    document.getElementById('total-pools').textContent = totalPools;
    document.getElementById('active-pools').textContent = activePools;
    if (Object.keys(pools).length === 0) {
      poolsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-600"><p class="text-lg font-semibold">No pools found yet</p><p class="text-gray-500">Create your first pool to get started!</p></div>';
    }
  } catch (error) {
    poolsGrid.innerHTML = '<p class="col-span-full text-center text-red-600 py-8">Failed to load pools. Please try again.</p>';
    showToast('Error loading pools: ' + error.message);
  }
}