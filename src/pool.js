import { showToast, localToZulu, zuluToLocal, formatDisplayTime, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';
let currentEditPoolId = null;
let poolDataMap = new Map();

export function resetPoolsOnDisconnect() {
  const poolsGrid = document.getElementById('pools-grid');
  poolsGrid.innerHTML = 'No wallet connected\nPlease connect your wallet to view or manage pools.\n';
  poolDataMap.clear();
  currentEditPoolId = null;
  document.getElementById('total-pools').textContent = '0';
  document.getElementById('active-pools').textContent = '0';
  document.getElementById('pool-details').classList.add('hidden');
  document.getElementById('no-pool-selected').classList.remove('hidden');
}

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

export async function createPool(event) {
  event.preventDefault();
  const poolPassword = document.getElementById('pool-password').value;
  const confirmPassword = document.getElementById('pool-password-confirm').value;
  if (!poolPassword) {
    showToast('Pool password is required.');
    return;
  }
  if (poolPassword !== confirmPassword) {
    showToast('Passwords do not match.');
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
}

export async function editPoolSubmit(event) {
  event.preventDefault();
  if (!currentEditPoolId) {
    showToast('No pool selected for editing.');
    return;
  }
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
    document.getElementById('edit-pool-form').reset();
    document.getElementById('whitelist-preview-edit').innerHTML = '';
    loadPools();
    showToast('Pool updated successfully!', 'success');
    reloadPoolDetails(currentEditPoolId);
  } catch (error) {
    showToast('Error updating pool: ' + error.message);
  }
}

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
    poolDataMap.set(currentEditPoolId, { ...pool, whitelist: updatedWhitelist });
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

export async function downloadWallet() {
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

export async function deletePoolConfirm() {
  if (!currentEditPoolId) {
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

export function editPool(poolId) {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  currentEditPoolId = poolId;
  document.getElementById('edit-pool-id').value = poolId;
  document.getElementById('edit-start-time').value = zuluToLocal(pool.startTime);
  document.getElementById('edit-end-time').value = zuluToLocal(pool.endTime);
  document.getElementById('edit-usage-cap').value = pool.usageCap;
  document.getElementById('edit-whitelist').value = pool.whitelist.join('\n');
  document.getElementById('edit-pool-password').value = '';
  document.getElementById('edit-modal').classList.remove('hidden');
  updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit');
}

export async function reloadPoolDetails(poolId) {
  if (!walletAddress) {
    showToast('Wallet is disconnected. Please connect a wallet to view pool details.');
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
    return;
  }
  try {
    const serverUrl = document.getElementById('server-url').value;
    if (!serverUrl) {
      showToast('Server URL is missing.');
      return;
    }
    const poolsResponse = await fetch(`${serverUrl}/pools?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!poolsResponse.ok) {
      const errorData = await poolsResponse.json();
      throw new Error(`${errorData.error || 'Failed to fetch pool data'} (${errorData.code || 'UNKNOWN_ERROR'})`);
    }
    const pools = await poolsResponse.json();
    const pool = pools[poolId];
    if (!pool) {
      showToast('Pool data not found.');
      return;
    }
    currentEditPoolId = poolId;
    const balanceResponse = await fetch(`${serverUrl}/pool/${encodeURIComponent(poolId)}/balance?creatorAddress=${encodeURIComponent(walletAddress)}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: { balance: 0 } };
    const balance = balanceData.balance || { balance: 0 };
    const now = new Date();
    const endTime = new Date(pool.endTime);
    const isEnded = now > endTime;
    const statusText = isEnded ? 'Ended' : 'Active';
    const statusColor = isEnded ? 'text-red-600' : 'text-green-600';
    document.getElementById('pool-details-content').innerHTML = '';
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    const detailsContent = `
      <div class="detail-section">
        <div class="detail-title">POOL INFORMATION</div>
        <div class="detail-value">
          <p><strong>Name:</strong> ${pool.name}</p>
          <p><strong>Status:</strong> <span class="${statusColor}">${statusText}</span></p>
          <p><strong>Pool ID:</strong> <span class="pool-id">${poolId}</span></p>
          <p><strong>Start Time:</strong> ${formatDisplayTime(pool.startTime)}</p>
          <p><strong>End Time:</strong> ${formatDisplayTime(pool.endTime)}</p>
          <p><strong>Usage Cap:</strong> ${pool.usageCap} Credits</p>
          <p><strong>Current Balance:</strong> ${(balance.balance || 0).toFixed(2)} Credits</p>
          <p><strong>Whitelisted Addresses (${pool.whitelist.length}):</strong></p>
          <div class="address-preview">${pool.whitelist.map(address => `<p>${address}</p>`).join('')}</div>
        </div>
      </div>
      <div class="detail-actions">
        ${!isEnded ? `<button onclick="editPool('${poolId}')" class="action-button btn-primary" style="margin-bottom: 15px;">EDIT POOL</button>` : ''}
        <div class="action-section">
          <div class="action-title">REVOKE ACCESS</div>
          <input type="text" id="revoke-address" placeholder="Enter wallet address to revoke" class="action-input" style="margin-bottom: 15px;">
          <button onclick="revokeAccess()" class="action-button btn-warning">REVOKE ACCESS</button>
        </div>
        <div class="action-section">
          <div class="action-title">DOWNLOAD WALLET</div>
          <button onclick="downloadWallet()" class="action-button btn-success">DOWNLOAD WALLET</button>
        </div>
        <div class="action-section">
          <div class="action-title">DELETE POOL</div>
          <button onclick="deletePoolConfirm()" class="action-button btn-delete">DELETE POOL</button>
        </div>
        <div class="action-section">
          <div class="action-title">TOP UP POOL</div>
          <button onclick="openTopUpModal('${poolId}')" class="action-button btn-primary">TOP UP</button>
        </div>
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
  } catch (error) {
    showToast('Error reloading pool details: ' + error.message);
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
  }
}

export function openTopUpModal(poolId) {
  if (!poolId || !currentEditPoolId) {
    showToast('No pool selected. Please view pool details first.');
    return;
  }
  if (!walletAddress) {
    showToast('Please connect your wallet first.');
    return;
  }

  // Remove existing modal if present to prevent duplicates
  const existingModal = document.getElementById('topup-modal');
  if (existingModal) existingModal.remove();

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'topup-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span id="close-topup-modal" class="close">×</span>
      <h2>Top Up Pool</h2>
      <form id="topup-form">
        <input type="hidden" id="topup-pool-id" value="${poolId}">
        <div class="form-group">
          <label for="topup-password">Pool Password:</label>
          <input type="password" id="topup-password" required>
        </div>
        <div class="form-group">
          <label for="topup-amount">AR Amount:</label>
          <input type="number" id="topup-amount" step="0.000000000001" min="0" required>
          <button type="button" id="use-max-ar">Use Max AR</button>
          <p id="estimated-credits" style="margin-top: 5px; font-size: 0.9em; color: #555;">Estimated Turbo Credits: 0</p>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary" id="topup-submit">Submit</button>
          <button type="button" id="cancel-topup" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Query elements directly from the modal
  const topUpForm = modal.querySelector('#topup-form');
  const passwordInput = modal.querySelector('#topup-password');
  const amountInput = modal.querySelector('#topup-amount');
  const useMaxArButton = modal.querySelector('#use-max-ar');
  const submitButton = modal.querySelector('#topup-submit');
  const cancelTopUpButton = modal.querySelector('#cancel-topup');
  const closeTopUpButton = modal.querySelector('#close-topup-modal');
  const estimatedCredits = modal.querySelector('#estimated-credits');

  // Validate elements
  if (!topUpForm || !passwordInput || !amountInput || !useMaxArButton || !submitButton || !cancelTopUpButton || !closeTopUpButton || !estimatedCredits) {
    console.error('Top-up modal elements not found after creation');
    showToast('Failed to initialize top-up modal');
    modal.remove();
    return;
  }

  // Function to show loading screen
  const showLoadingScreen = () => {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    loadingOverlay.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      ">
        <div style="
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
        <p style="margin-top: 10px;">Processing Top-Up...</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
    // Add CSS animation for spinner
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  };

  // Function to hide loading screen
  const hideLoadingScreen = () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.remove();
  };

  // Function to update estimated Turbo Credits
  const updateEstimatedCredits = () => {
    const amount = parseFloat(amountInput.value);
    if (!isNaN(amount) && amount > 0) {
      const fee = 0.234; // 23.4% fee from Turbo Topup
      const turboCredits = amount * (1 - fee);
      estimatedCredits.textContent = `Estimated Turbo Credits: ${turboCredits.toFixed(6)}`;
    } else {
      estimatedCredits.textContent = 'Estimated Turbo Credits: 0';
    }
  };

  // Add event listener for amount input
  amountInput.addEventListener('input', updateEstimatedCredits);

  // Add event listener for "Use Max AR"
  useMaxArButton.addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password) {
      showToast('Please enter the pool password.');
      return;
    }
    try {
      showLoadingScreen();
      const serverUrl = document.getElementById('server-url').value;
      if (!serverUrl) {
        showToast('Server URL is missing.');
        hideLoadingScreen();
        return;
      }
      const url = new URL(`${serverUrl}/pool/${encodeURIComponent(poolId)}/ar-balance`);
      url.searchParams.append('password', encodeURIComponent(password));
      url.searchParams.append('creatorAddress', walletAddress);
      const response = await fetch(url, {
        headers: { 'X-API-Key': DEPLOY_API_KEY }
      });
      const result = await response.json();
      hideLoadingScreen();
      if (!response.ok) {
        throw new Error(`${result.error || 'Failed to fetch AR balance'} (${result.code || 'UNKNOWN_ERROR'})`);
      }
      amountInput.value = result.balance;
      amountInput.dispatchEvent(new Event('input')); // Trigger credits update
    } catch (error) {
      hideLoadingScreen();
      showToast(`Error fetching AR balance: ${error.message}`);
    }
  });

  // Add event listener for form submission
  topUpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    const amount = amountInput.value;
    if (!password || !amount) {
      showToast('Password and amount are required.');
      return;
    }
    if (parseFloat(amount) <= 0) {
      showToast('Amount must be greater than 0.');
      return;
    }
    try {
      showLoadingScreen();
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      const serverUrl = document.getElementById('server-url').value;
      if (!serverUrl) {
        showToast('Server URL is missing.');
        hideLoadingScreen();
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
        return;
      }
      const url = new URL(`${serverUrl}/pool/${encodeURIComponent(poolId)}/topup`);
      url.searchParams.append('creatorAddress', walletAddress);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
        body: JSON.stringify({ password, amount })
      });
      const result = await response.json();
      hideLoadingScreen();
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
      if (!response.ok) {
        throw new Error(`${result.error || 'Failed to top up pool'} (${result.code || 'UNKNOWN_ERROR'})`);
      }
      modal.remove();
      showToast(`Pool topped up successfully! Transaction ID: ${result.transactionId}`, 'success');
      reloadPoolDetails(poolId);
    } catch (error) {
      hideLoadingScreen();
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
      showToast(`Error topping up pool: ${error.message}`, 'error');
    }
  });

  // Add event listeners for cancel/close
  const handleClose = () => {
    modal.remove();
  };
  cancelTopUpButton.addEventListener('click', handleClose);
  closeTopUpButton.addEventListener('click', handleClose);
}

export async function viewDetails(poolId) {
  if (!walletAddress) {
    showToast('Wallet is disconnected. Please connect a wallet to view pool details.');
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
    return;
  }
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
    const statusColor = isEnded ? 'text-red-600' : 'text-green-600';
    document.getElementById('pool-details-content').innerHTML = '';
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    const detailsContent = `
      <div class="detail-section">
        <div class="detail-title">POOL INFORMATION</div>
        <div class="detail-value">
          <p><strong>Name:</strong> ${pool.name}</p>
          <p><strong>Status:</strong> <span class="${statusColor}">${statusText}</span></p>
          <p><strong>Pool ID:</strong> <span class="pool-id">${poolId}</span></p>
          <p><strong>Start Time:</strong> ${formatDisplayTime(pool.startTime)}</p>
          <p><strong>End Time:</strong> ${formatDisplayTime(pool.endTime)}</p>
          <p><strong>Usage Cap:</strong> ${pool.usageCap} Credits</p>
          <p><strong>Current Balance:</strong> ${(balance.balance || 0).toFixed(2)} Credits</p>
          <p><strong>Whitelisted Addresses (${pool.whitelist.length}):</strong></p>
          <div class="address-preview">${pool.whitelist.map(address => `<p>${address}</p>`).join('')}</div>
        </div>
      </div>
      <div class="detail-actions">
        ${!isEnded ? `<button onclick="editPool('${poolId}')" class="action-button btn-primary" style="margin-bottom: 15px;">EDIT POOL</button>` : ''}
        <div class="action-section">
          <div class="action-title">REVOKE ACCESS</div>
          <input type="text" id="revoke-address" placeholder="Enter wallet address to revoke" class="action-input" style="margin-bottom: 15px;">
          <button onclick="revokeAccess()" class="action-button btn-warning">REVOKE ACCESS</button>
        </div>
        <div class="action-section">
          <div class="action-title">DOWNLOAD WALLET</div>
          <button onclick="downloadWallet()" class="action-button btn-success">DOWNLOAD WALLET</button>
        </div>
        <div class="action-section">
          <div class="action-title">DELETE POOL</div>
          <button onclick="deletePoolConfirm()" class="action-button btn-delete">DELETE POOL</button>
        </div>
        <div class="action-section">
          <div class="action-title">TOP UP POOL</div>
          <button onclick="openTopUpModal('${poolId}')" class="action-button btn-primary">TOP UP</button>
        </div>
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
  } catch (error) {
    showToast('Error loading pool details: ' + error.message);
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
  }
}

export async function loadPools() {
  const poolsGrid = document.getElementById('pools-grid');
  poolsGrid.classList.add('loading');

  if (!walletAddress) {
    console.log('No wallet connected, clearing pools UI');
    resetPoolsOnDisconnect();
    poolsGrid.classList.remove('loading');
    return;
  }

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
      const isActive = poolId === currentEditPoolId ? 'active' : '';
      const poolCard = document.createElement('div');
      poolCard.className = `pool-card p-6 bg-white shadow rounded-2xl ${isActive}`;
      poolCard.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">${pool.name}</h3>
        <span class="text-sm font-medium ${statusColor} px-2 py-1 rounded-full">${statusText}</span>
        <div class="mt-4 space-y-2 text-sm">
          <p><span class="font-medium">Balance:</span> ${(balance.balance || 0).toFixed(4)}</p>
          <p><span class="font-medium">Usage Cap:</span> ${pool.usageCap}</p>
          <p><span class="font-medium">Duration:</span> ${formatDisplayTime(pool.startTime)} - ${formatDisplayTime(pool.endTime)}</p>
          <p><span class="font-medium">Addresses:</span> ${pool.whitelist.length}</p>
        </div>
        <button onclick="viewDetails('${poolId}')" class="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors">Pool Actions</button>
      `;
      poolsGrid.appendChild(poolCard);
    }
    document.getElementById('total-pools').textContent = totalPools;
    document.getElementById('active-pools').textContent = activePools;
    if (Object.keys(pools).length === 0) {
      poolsGrid.innerHTML = 'No pools found yet\nCreate your first pool to get started!\n';
    }
  } catch (error) {
    poolsGrid.innerHTML = 'Failed to load pools. Please try again.\n';
    showToast('Error loading pools: ' + error.message);
  } finally {
    poolsGrid.classList.remove('loading');
  }
}

function initializeModalListeners() {
  const createPoolBtn = document.getElementById('create-pool-btn');
  const closeCreateModal = document.getElementById('close-create-modal');
  const cancelCreate = document.getElementById('cancel-create');
  const createSubmitBtn = document.getElementById('create-submit-btn');
  const closeEditModal = document.getElementById('close-edit-modal');
  const cancelEdit = document.getElementById('cancel-edit');
  const editSubmitBtn = document.getElementById('edit-submit-btn');

  if (createPoolBtn) {
    createPoolBtn.addEventListener('click', () => {
      document.getElementById('create-modal').classList.remove('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (closeCreateModal) {
    closeCreateModal.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (cancelCreate) {
    cancelCreate.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (createSubmitBtn) {
    createSubmitBtn.addEventListener('click', (event) => {
      createPool(event);
    });
  }
  if (closeEditModal) {
    closeEditModal.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }
  if (editSubmitBtn) {
    editSubmitBtn.addEventListener('click', (event) => {
      editPoolSubmit(event);
    });
  }
}

document.addEventListener('walletDisconnected', () => {
  console.log('walletDisconnected event caught, refreshing pools');
  loadPools();
});

document.addEventListener('DOMContentLoaded', () => {
  initializeModalListeners();
  loadPools();
});