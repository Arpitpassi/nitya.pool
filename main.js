const DEPLOY_API_KEY = 'deploy-api-key-123';
let arweave = window.Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
let walletAddress = null;
let currentEditPoolId = null;
let poolDataMap = new Map();
let turbo;

// Toast Notification
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

// Time Management
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

// Validate Arweave Address
function isValidArweaveAddress(address) {
  return /^[a-zA-Z0-9_-]{43}$/.test(address.trim());
}

// Update Whitelist Preview
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

// Initialize Turbo Client
async function initializeTurbo() {
  try {
    const signer = new window.Turbo.ArweaveSigner(window.arweaveWallet);
    turbo = window.Turbo.TurboFactory.authenticated({ signer });
    walletAddress = await window.arweaveWallet.getActiveAddress();
    document.getElementById('wallet-status').textContent = `Connected: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
    document.getElementById('connect-wallet').classList.add('hidden');
    document.getElementById('disconnect-wallet').classList.remove('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadPools();
  } catch (error) {
    showToast('Failed to initialize Turbo client: ' + error.message);
  }
}

// Wallet Connection
document.getElementById('connect-wallet').addEventListener('click', async () => {
  try {
    if (window.arweaveWallet) {
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGNATURE']);
      await initializeTurbo();
    } else {
      showToast('Arweave wallet extension not detected.');
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

// Modal Controls
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

// Create Pool
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
    const response = await fetch(`${document.getElementById('server-url').value}/pools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(poolData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create pool');

    // Share credits with whitelisted addresses
    for (const address of addresses) {
      await turbo.shareCredits({
        approvedAddress: address,
        approvedWincAmount: BigInt(Math.round(poolData.usageCap * 1e12)).toString(),
        expiresBySeconds: Math.floor((endTime - new Date()) / 1000)
      });
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

// Edit Pool
window.editPool = (poolId) => {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  currentEditPoolId = poolId;
  document.getElementById('edit-pool-name').value = pool.name;
  document.getElementById('edit-start-time').value = zuluToLocal(pool.startTime);
  document.getElementById('edit-end-time').value = zuluToLocal(pool.endTime);
  document.getElementById('edit-usage-cap').value = pool.usageCap;
  document.getElementById('edit-whitelist').value = pool.whitelist.join('\n');
  document.getElementById('edit-sponsor-info').value = pool.sponsorInfo || '';
  document.getElementById('edit-modal').classList.remove('hidden');
  updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit');
};

document.getElementById('edit-pool-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const addresses = document.getElementById('edit-whitelist').value.split('\n').map(a => a.trim()).filter(a => a);
  const invalidAddresses = addresses.filter(a => !isValidArweaveAddress(a));
  if (invalidAddresses.length > 0) {
    showToast('Please fix invalid addresses: ' + invalidAddresses.join(', '));
    return;
  }
  const startTime = new Date(document.getElementById('edit-start-time').value);
  const endTime = new Date(document.getElementById('edit-end-time').value);
  if (startTime >= endTime) {
    showToast('Start time must be before end time.');
    return;
  }

  const updates = {
    name: document.getElementById('edit-pool-name').value,
    startTime: localToZulu(document.getElementById('edit-start-time').value),
    endTime: localToZulu(document.getElementById('edit-end-time').value),
    usageCap: parseFloat(document.getElementById('edit-usage-cap').value),
    whitelist: addresses,
    sponsorInfo: document.getElementById('edit-sponsor-info').value
  };

  try {
    const pool = poolDataMap.get(currentEditPoolId);
    const oldWhitelist = pool.whitelist;
    const newWhitelist = addresses;

    // Revoke credits for removed addresses
    const removedAddresses = oldWhitelist.filter(addr => !newWhitelist.includes(addr));
    for (const address of removedAddresses) {
      await turbo.revokeCredits({ approvedAddress: address });
    }

    // Share credits with new addresses
    const addedAddresses = newWhitelist.filter(addr => !oldWhitelist.includes(addr));
    for (const address of addedAddresses) {
      await turbo.shareCredits({
        approvedAddress: address,
        approvedWincAmount: BigInt(Math.round(updates.usageCap * 1e12)).toString(),
        expiresBySeconds: Math.floor((endTime - new Date()) / 1000)
      });
    }

    // Update existing addresses if usageCap or endTime changed
    const unchangedAddresses = newWhitelist.filter(addr => oldWhitelist.includes(addr));
    if (updates.usageCap !== pool.usageCap || updates.endTime !== pool.endTime) {
      for (const address of unchangedAddresses) {
        await turbo.revokeCredits({ approvedAddress: address });
        await turbo.shareCredits({
          approvedAddress: address,
          approvedWincAmount: BigInt(Math.round(updates.usageCap * 1e12)).toString(),
          expiresBySeconds: Math.floor((endTime - new Date()) / 1000)
        });
      }
    }

    const response = await fetch(`${document.getElementById('edit-server-url').value}/pools/${currentEditPoolId}?creatorAddress=${walletAddress}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify(updates)
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

// View Pool Details
window.viewDetails = async (poolId) => {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  try {
    const balanceResponse = await fetch(`${document.getElementById('server-url').value}/pools/${poolId}/balance?creatorAddress=${walletAddress}`, {
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
        </div>
        <div class="space-y-6">
          <div class="pool-details-section rounded-2xl p-6">
            <h4 class="font-bold text-gray-900 mb-4 text-lg">Whitelisted Addresses (${pool.whitelist.length})</h4>
            <div class="max-h-80 overflow-y-auto space-y-2">
              ${pool.whitelist.map(address => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span class="text-xs font-mono text-gray-700 break-all flex-1 mr-4">${address}</span>
                  ${walletAddress === pool.creatorAddress ? `<button onclick="revokeAccess('${poolId}', '${address}')" class="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg text-sm font-semibold transition-all">Revoke</button>` : ''}
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

// Revoke Access
window.revokeAccess = async (poolId, address) => {
  try {
    await turbo.revokeCredits({ approvedAddress: address });
    const response = await fetch(`${document.getElementById('server-url').value}/pools/${poolId}/whitelist/${address}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!response.ok) throw new Error('Failed to revoke access');
    showToast('Access revoked successfully!', 'success');
    viewDetails(poolId);
  } catch (error) {
    showToast('Error revoking access: ' + error.message);
  }
};

// Download Wallet (Placeholder)
window.downloadWallet = async (poolId) => {
  showToast('Wallet download not implemented in this version.');
};

// Load Pools
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
      try {
        const balanceResponse = await fetch(`${document.getElementById('server-url').value}/pools/${poolId}/balance?creatorAddress=${walletAddress}`, {
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
            <button onclick="downloadWallet('${poolId}')" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Download Wallet</button>
            ${!isEnded ? `<button onclick="editPool('${poolId}')" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Edit Pool</button>` : ''}
          </div>
        `;
        poolsGrid.appendChild(poolCard);
      } catch (error) {
        console.error(`Error loading data for pool ${poolId}:`, error);
      }
    }

    document.getElementById('total-pools').textContent = totalPools;
    document.getElementById('active-pools').textContent = activePools;

    if (Object.keys(pools).length === 0) {
      poolsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-600"><p class="text-lg">No pools found yet</p><p class="text-gray-500">Create your first pool to get started!</p></div>';
    }
  } catch (error) {
    console.error('Error loading pools:', error);
    poolsGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Failed to load pools. Please try again.</p>';
    showToast('Error loading pools: ' + error.message);
  }
}

// Initialize Whitelist Previews
document.getElementById('whitelist').addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
document.getElementById('edit-whitelist').addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));