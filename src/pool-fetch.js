import { showToast, isValidArweaveAddress, formatDisplayTime } from './utils.js';
import { walletAddress } from './wallet.js';
import { poolDataMap, getCurrentEditPoolId } from './pool-utils.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';

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
      const isActive = poolId === getCurrentEditPoolId() ? 'active' : '';
      const poolCard = document.createElement('div');
      poolCard.className = `pool-card p-6 bg-white shadow rounded-2xl ${isActive}`;
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
          <button onclick="viewDetails('${poolId}')" class="w-full btn-primary py-2 rounded-lg text-sm font-semibold transition-all">Pool Actions</button>
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
  } finally {
    poolsGrid.classList.remove('loading');
  }
}