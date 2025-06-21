import { showToast, localToZulu, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';
import { loadPools } from './poolLoading.js';
import { reloadPoolDetails } from './poolDetails.js';
import { getCurrentEditPoolId, setCurrentEditPoolId, getPoolDataMap, DEPLOY_API_KEY } from './pools.js';

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
  const currentEditPoolId = getCurrentEditPoolId();
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

export function editPool(poolId) {
  const poolDataMap = getPoolDataMap();
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

export async function deletePoolConfirm() {
  const currentEditPoolId = getCurrentEditPoolId();
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