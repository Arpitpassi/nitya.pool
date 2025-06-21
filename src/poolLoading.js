import { showToast, formatDisplayTime } from './utils.js';
import { walletAddress } from './wallet.js';
import { viewDetails } from './poolDetails.js';
import { getPoolDataMap, setCurrentEditPoolId, getCurrentEditPoolId } from './state.js';
import { DEPLOY_API_KEY } from './pools.js';

export function resetPoolsOnDisconnect() {
  const poolsGrid = document.getElementById('pools-grid');
  poolsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-600"><p class="text-lg font-semibold">No wallet connected</p><p class="text-gray-500">Please connect your wallet to view or manage pools.</p></div>';
  const poolDataMap = getPoolDataMap();
  poolDataMap.clear();
  setCurrentEditPoolId(null);
  document.getElementById('total-pools').textContent = '0';
  document.getElementById('active-pools').textContent = '0';
  document.getElementById('pool-details').classList.add('hidden');
  document.getElementById('no-pool-selected').classList.remove('hidden');
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
    const poolDataMap = getPoolDataMap();
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