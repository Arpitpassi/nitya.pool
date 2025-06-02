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
  preview.innerHTML = addresses.map((address, index) => `
    <div class="address-item ${isValidArweaveAddress(address) ? 'valid' : 'invalid'}">
      <span class="break-all">${address}</span>
      <button type="button" class="remove-address-btn" data-index="${index}" data-textarea="${textareaId}">×</button>
    </div>
  `).join('');
  preview.querySelectorAll('.remove-address-btn').forEach(button => {
    button.addEventListener('click', () => {
      const index = parseInt(button.dataset.index);
      const textarea = document.getElementById(button.dataset.textarea);
      const addresses = textarea.value.split('\n').map(a => a.trim()).filter(a => a);
      addresses.splice(index, 1);
      textarea.value = addresses.join('\n');
      updateWhitelistPreview(textareaId, previewId);
    });
  });
}

document.getElementById('whitelist').addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
document.getElementById('edit-whitelist').addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));

document.getElementById('connect-wallet').addEventListener('click', async () => {
  try {
    if (window.arweaveWallet) {
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGNATURE']);
      walletAddress = await window.arweaveWallet.getActiveAddress();
      document.getElementById('wallet-status').textContent = `Connected: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
      document.getElementById('connect-wallet').classList.add('hidden');
      document.getElementById('disconnect-wallet').classList.remove('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadPools();
    } else {
      showToast('Wander Wallet extension not detected.');
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

document.getElementById('support-btn').addEventListener('click', () => {
  const link = prompt('Enter the support link URL:');
  if (link) window.open(link, '_blank');
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

document.getElementById('close-details').addEventListener('click', () => document.getElementById('details-modal').classList.add('hidden'));

document.getElementById('create-pool-form').addEventListener('submit', async (e) => {
  e.preventDefault();
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
    startTime: localToZulu(document.getElementById('start-time').value),
    endTime: localToZulu(document.getElementById('end-time').value),
    usageCap: parseFloat(document.getElementById('usage-cap').value),
    whitelist: addresses,
    creatorAddress: walletAddress,
    sponsorInfo: document.getElementById('sponsor-info').value
  };
  try {
    const message = JSON.stringify(poolData);
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/create-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ ...poolData, signature, message })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create pool');
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
  try {
    const message = JSON.stringify({ poolId: currentEditPoolId, updates });
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/pool/${currentEditPoolId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ ...updates, signature, message, creatorAddress: walletAddress })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update pool');
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('whitelist-preview-edit').innerHTML = '';
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
    const secondsUntilEnd = Math.floor((endTime - currentTime) / 1000);
    if (secondsUntilEnd <= 0) {
      showToast('Pool has ended, cannot sponsor credits.');
      return;
    }
    const message = JSON.stringify({ poolId, action: 'sponsor-credits' });
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/share-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ eventPoolId: poolId, signature, message, creatorAddress: walletAddress })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to sponsor credits');
    showToast('Credits sponsored successfully!', 'success');
    loadPools();
  } catch (error) {
    showToast('Error sponsoring credits: ' + error.message);
  }
}

async function revokeAccess(poolId, address) {
  try {
    const pool = poolDataMap.get(poolId);
    if (!pool) {
      showToast('Pool data not found.');
      return;
    }
    const message = JSON.stringify({ poolId, address, action: 'revoke-access' });
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/revoke-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ poolId, address, signature, message, creatorAddress: walletAddress })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to revoke access');
    showToast('Access revoked successfully!', 'success');
    loadPools();
  } catch (error) {
    showToast('Error revoking access: ' + error.message);
  }
}

window.deletePoolConfirm = async () => {
  const confirmDelete = confirm('Are you sure you want to delete this pool? This action cannot be undone.');
  if (confirmDelete) {
    try {
      const message = JSON.stringify({ poolId: currentEditPoolId, action: 'delete-pool' });
      const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
      const response = await fetch(`${document.getElementById('server-url').value}/pool/${currentEditPoolId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
        body: JSON.stringify({ signature, message, creatorAddress: walletAddress })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete pool');
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
    const balanceResponse = await fetch(`${document.getElementById('server-url').value}/pool/${poolId}/balance?creatorAddress=${walletAddress}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: { balance: 0 } };
    const balance = balanceData.balance || { balance: 0 };
    const usage = pool.usage || {};
    const now = new Date();
    const endTime = new Date(pool.endTime);
    const isEnded = now > endTime;
    const statusText = isEnded ? 'Ended' : 'Active';
    const statusColor = isEnded ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
    const usageEntries = Object.entries(usage);
    const totalUsage = usageEntries.reduce((sum, [, usageAmount]) => sum + Number(usageAmount || 0), 0);
    const detailsContent = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-6">
          <div class="pool-details-section rounded-2xl p-6">
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
          <div class="pool-details-section rounded-2xl p-6">
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
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-gray-600 font-medium">Total Usage:</span>
                <span class="font-semibold">${totalUsage.toFixed(12)}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-gray-600 font-medium">Remaining:</span>
                <span class="font-semibold text-green-600">${(pool.usageCap - totalUsage).toFixed(12)} Credits</span>
              </div>
            </div>
          </div>
          <div class="pool-details-section rounded-2xl p-6">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Wallet Balance</h4>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2">
                <span class="text-gray-600 font-medium">Current Balance:</span>
                <span class="font-bold text-2xl text-indigo-600">${(balance.balance || 0).toFixed(12)}</span>
              </div>
            </div>
          </div>
          <div class="pool-details-section rounded-2xl p-6">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Actions</h4>
            <button onclick="sponsorCredits('${poolId}')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-all mb-2">Sponsor Credits</button>
            <button onclick="downloadWallet('${poolId}')" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Download Wallet</button>
          </div>
        </div>
        <div class="space-y-6">
          <div class="pool-details-section rounded-2xl p-6">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Whitelisted Addresses (${pool.whitelist.length})</h4>
            <div class="max-h-80 overflow-y-auto space-y-2">
              ${pool.whitelist.map(address => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span class="text-xs font-mono text-gray-700 break-all flex-1 mr-4">${address}</span>
                  <button onclick="revokeAccess('${poolId}', '${address}')" class="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded-lg">Revoke</button>
                </div>
              `).join('')}
            </div>
          </div>
          ${usageEntries.length > 0 ? `
            <div class="pool-details-section rounded-2xl p-6">
              <h4 class="font-bold text-gray-900 mb-4 text-lg">Usage by Address (${usageEntries.length})</h4>
              <div class="max-h-80 overflow-y-auto space-y-2">
                ${usageEntries.map(([address, usageAmount]) => `
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span class="text-xs font-mono text-gray-700 break-all flex-1 mr-4">${address}</span>
                    <span class="text-sm font-semibold text-indigo-600">${Number(usageAmount || 0).toFixed(12)} Credits</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('details-modal').classList.remove('hidden');
  } catch (error) {
    showToast('Error loading pool details: ' + error.message);
  }
};

async function downloadWallet(poolId) {
  try {
    const message = JSON.stringify({ poolId, action: 'download-wallet' });
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/pool/${poolId}/wallet`, {
      method: 'GET',
      headers: { 'X-API-Key': DEPLOY_API_KEY, 'X-Signature': signature, 'X-Message': message }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to download wallet');
    const walletBlob = new Blob([JSON.stringify(result.wallet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(walletBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${poolId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Wallet downloaded successfully!', 'success');
  } catch (error) {
    showToast('Error downloading wallet: ' + error.message);
  }
}

async function loadPools() {
  const poolsGrid = document.getElementById('pools-grid');
  try {
    const response = await fetch(`${document.getElementById('server-url').value}/pools?creatorAddress=${walletAddress}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch pools');
    }
    const pools = await response.json();
    poolDataMap.clear();
    poolsGrid.innerHTML = '';
    let totalPools = 0, activePools = 0;
    for (const [poolId, pool] of Object.entries(pools)) {
      poolDataMap.set(poolId, pool);
      totalPools++;
      const balanceResponse = await fetch(`${document.getElementById('server-url').value}/pool/${poolId}/balance?creatorAddress=${walletAddress}`, {
        headers: { 'X-API-Key': DEPLOY_API_KEY }
      });
      const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: { balance: 0 } };
      const balance = balanceData.balance || { balance: 0 };
      const usageData = { usage: pool.usage || {} };
      const now = new Date();
      const endTime = new Date(pool.endTime);
      const isEnded = now > endTime;
      if (!isEnded) activePools++;
      const statusColor = isEnded ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
      const statusText = isEnded ? 'Ended' : 'Active';
      const usageEntries = Object.entries(usageData.usage);
      const totalUsage = usageEntries.reduce((sum, [, usage]) => sum + Number(usage || 0), 0);
      const poolCard = document.createElement('div');
      poolCard.className = 'pool-card p-6';
      poolCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900">${pool.name}</h3>
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColor}">${statusText}</span>
        </div>
        <div class="space-y-3 text-sm text-gray-600 mb-6">
          <div class="flex justify-between">
            <span>Balance:</span>
            <span class="font-semibold">${(balance.balance || 0).toFixed(4)} Credits</span>
          </div>
          <div class="flex justify-between">
            <span>Usage:</span>
            <span class="font-semibold">${totalUsage.toFixed(4)} / ${pool.usageCap}</span>
          </div>
          <div class="flex justify-between">
            <span>Duration:</span>
            <span class="text-xs">${formatDisplayTime(pool.startTime)} - ${formatDisplayTime(pool.endTime)}</span>
          </div>
          <div class="flex justify-between">
            <span>Addresses:</span>
            <span class="font-semibold">${pool.whitelist.length} whitelisted</span>
          </div>
        </div>
        <div class="space-y-2">
          <button onclick="viewDetails('${poolId}')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">View Details</button>
          ${!isEnded ? `<button onclick="editPool('${poolId}')" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Edit Pool</button>` : ''}
        </div>
      `;
      poolsGrid.appendChild(poolCard);
    }
    document.getElementById('total-pools').textContent = totalPools;
    document.getElementById('active-pools').textContent = activePools;
    if (Object.keys(pools).length === 0) {
      poolsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-600"><p class="text-lg">No pools found yet</p><p class="text-gray-500">Create your first pool to get started!</p></div>';
    }
  } catch (error) {
    poolsGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Failed to load pools. Please try again.</p>';
    showToast('Error loading pools: ' + error.message);
  }
}