import { showToast, formatDisplayTime } from './utils.js';
import { walletAddress } from './wallet.js';
import { sponsorCredits } from './creditOperations.js';
import { editPool } from './poolManagement.js';
import { openTopUpModal } from './topUpModal.js';
import { downloadWallet } from './utilsModule.js';
import { revokeAccess } from './creditOperations.js';
import { deletePoolConfirm } from './poolManagement.js';
import { getCurrentEditPoolId, setCurrentEditPoolId, getPoolDataMap, DEPLOY_API_KEY } from './pools.js';

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
    // Fetch fresh pool data from the server
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
    // Fetch the latest pool balance
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

    // Clear previous content to ensure fresh render
    document.getElementById('pool-details-content').innerHTML = '';
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');

    // Populate pool-details-content with pool info and actions
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
        <div class="action-section">
          <div class="action-title">TOP UP POOL</div>
          <button onclick="openTopUpModal('${poolId}')" class="action-button btn-primary">TOP UP</button>
        </div>
      </div>
    `;
    // Update pool-details-content and toggle visibility
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    // Attach event listeners to buttons
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

export async function viewDetails(poolId) {
  if (!walletAddress) {
    showToast('Wallet is disconnected. Please connect a wallet to view pool details.');
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.remove('hidden');
    return;
  }
  const poolDataMap = getPoolDataMap();
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

    // Clear previous content to ensure fresh render
    document.getElementById('pool-details-content').innerHTML = '';
    document.getElementById('pool-details').classList.add('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');

    // Populate pool-details-content with pool info and actions
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
        <div class="action-section">
          <div class="action-title">TOP UP POOL</div>
          <button onclick="openTopUpModal('${poolId}')" class="action-button btn-primary">TOP UP</button>
        </div>
      </div>
    `;
    // Update pool-details-content and toggle visibility
    document.getElementById('pool-details-content').innerHTML = detailsContent;
    document.getElementById('pool-details').classList.remove('hidden');
    document.getElementById('no-pool-selected').classList.add('hidden');
    // Attach event listeners to buttons
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