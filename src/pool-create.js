import { showToast, localToZulu, isValidArweaveAddress } from './utils.js';
import { walletAddress } from './wallet.js';
import { loadPools } from './pool-fetch.js';

const DEPLOY_API_KEY = 'deploy-api-key-123';

export async function createPool(event) {
  event.preventDefault();
  const poolPassword = document.getElementById('pool-password bradford').value;
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