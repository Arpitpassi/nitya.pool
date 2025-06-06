import { showToast, formatDisplayTime, zuluToLocal } from './utils.js';
import { walletAddress } from './wallet.js';
import { poolDataMap, getCurrentEditPoolId, setCurrentEditPoolId } from './pool-utils.js';
import { sponsorCredits } from './pool-actions.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';

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
  setCurrentEditPoolId(poolId);
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
        <div id="pool-info" class="detail-value">
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Name:</span>
            <span class="font-semibold">${pool.name}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Status:</span>
            <span class="font-semibold ${statusColor}">${statusText}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Pool ID:</span>
            <span class="font-semibold">${poolId}</span>
          </div>
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
            <span class="text-gray-600 font-medium">Current Balance:</span>
            <span class="font-semibold">${(balance.balance || 0).toFixed(2)} Credits</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-600 font-medium">Whitelisted Addresses (${pool.whitelist.length}):</span>
            <div class="max-h-80 overflow-y-auto">
              ${pool.whitelist.map(address => `
                <div class="address-item valid break-all">${address}</div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-4 mt-4">
          ${!isEnded ? `<button onclick="editPool('${poolId}')" class="py-1 px-4 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all">EDIT POOL</button>` : ''}
          <button id="sponsor-btn-${poolId}" class="py-1 px-4 text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-all">SPONSOR CREDITS</button>
        </div>
      </div>
      <div class="detail-actions">
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
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    const sponsorButton = document.getElementById(`sponsor-btn-${poolId}`);
    if (sponsorButton) {
      sponsorButton.addEventListener('click', () => sponsorCredits(poolId));
    }
  } catch (error) {
    showToast('Error loading pool details: ' + error.message);
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
  }
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
    setCurrentEditPoolId(poolId);
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
        <div id="pool-info" class="detail-value">
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Name:</span>
            <span class="font-semibold">${pool.name}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Status:</span>
            <span class="font-semibold ${statusColor}">${statusText}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600 font-medium">Pool ID:</span>
            <span class="font-semibold">${poolId}</span>
          </div>
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
            <span class="text-gray-600 font-medium">Current Balance:</span>
            <span class="font-semibold">${(balance.balance || 0).toFixed(2)} Credits</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-600 font-medium">Whitelisted Addresses (${pool.whitelist.length}):</span>
            <div class="max-h-80 overflow-y-auto">
              ${pool.whitelist.map(address => `
                <div class="address-item valid break-all">${address}</div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-4 mt-4">
          ${!isEnded ? `<button onclick="editPool('${poolId}')" class="py-1 px-4 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all">EDIT POOL</button>` : ''}
          <button id="sponsor-btn-${poolId}" class="py-1 px-4 text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-all">SPONSOR CREDITS</button>
        </div>
      </div>
      <div class="detail-actions">
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
      </div>
    `;
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    const sponsorButton = document.getElementById(`sponsor-btn-${poolId}`);
    if (sponsorButton) {
      sponsorButton.addEventListener('click', () => sponsorCredits(poolId));
    }
  } catch (error) {
    showToast('Error reloading pool details: ' + error.message);
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
  }
}

export function initializeModalListeners() {
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
      document.getElementById('edit-pool-form').value;
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset;
      document.getElementById('whitelist-preview-edit').value = '';
    });
  }
  if (editSubmitBtn) {
    editSubmitBtn.addEventListener('click', (event) => {
      editPoolSubmit(event);
    });
  }
}