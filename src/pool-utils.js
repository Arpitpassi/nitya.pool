export let currentEditPoolId = null;
export let poolDataMap = new Map();

export function resetPoolsOnDisconnect() {
  const poolsGrid = document.getElementById('pools-grid');
  poolsGrid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-600"><p class="text-lg font-semibold">No wallet connected</p><p class="text-gray-500">Please connect your wallet to view or manage pools.</p></div>';
  poolDataMap.clear();
  currentEditPoolId = null;
  document.getElementById('total-pools').textContent = '0';
  document.getElementById('active-pools').textContent = '0';
  document.getElementById('pool-details').classList.add('hidden');
  document.getElementById('no-pool-selected').classList.remove('hidden');
}

export function getCurrentEditPoolId() {
  return currentEditPoolId;
}

export function setCurrentEditPoolId(poolId) {
  currentEditPoolId = poolId;
}