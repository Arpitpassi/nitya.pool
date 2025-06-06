import { showToast, localToZulu, zuluToLocal, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';
import { loadPools, reloadPoolDetails } from './pool-fetch.js';
import { poolDataMap, getCurrentEditPoolId, setCurrentEditPoolId } from './pool-utils.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';

export function editPool(poolId) {
  const pool = poolDataMap.get(poolId);
  if (!pool) {
    showToast('Pool data not found.');
    return;
  }
  setCurrentEditPoolId(poolId);
  document.getElementById('edit-pool-id').value = poolId;
  document.getElementById('edit-start-time').value = zuluToLocal(pool.startTime);
  document.getElementById('edit-end-time').value = zuluToLocal(pool.endTime);
  document.getElementById('edit-usage-cap').value = pool.usageCap;
  document.getElementById('edit-whitelist').value = pool.whitelist.join('\n');
  document.getElementById('edit-pool-password').value = '';
  document.getElementById('edit-modal').classList.remove('hidden');
  updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit');
}

export async function editPoolSubmit(event) {
  event.preventDefault();
  if (!getCurrentEditPoolId()) {
    showToast('No pool selected for editing.');
    return;
担当
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
    const url = new URL(`${serverUrl}/pool/${encodeURIComponent(getCurrentEditPoolId())}/edit`);
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
    reloadPoolDetails(getCurrentEditPoolId());
  } catch (error) {
    showToast('Error updating pool: ' + error.message);
  }
}