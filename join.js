const DEPLOY_API_KEY = 'deploy-api-key-123';
let walletAddress = null;

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

function copyPoolId(poolId) {
  navigator.clipboard.writeText(poolId).then(() => {
    showToast('Pool ID copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy Pool ID.');
  });
}

async function joinPool(poolId) {
  try {
    if (!document.getElementById('terms-' + poolId).checked) {
      showToast('You must accept the terms of service.');
      return;
    }
    const message = JSON.stringify({ poolId, walletAddress, action: 'join-pool' });
    const signature = await window.arweaveWallet.signMessage(new TextEncoder().encode(message));
    const response = await fetch(`${document.getElementById('server-url').value}/join-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': DEPLOY_API_KEY },
      body: JSON.stringify({ poolId, walletAddress, signature, message })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to join pool');
    showToast('Successfully joined pool!', 'success');
    loadAvailablePools();
  } catch (error) {
    showToast('Error joining pool: ' + error.message);
  }
}

async function loadAvailablePools() {
  const poolsGrid = document.getElementById('available-pools');
  poolsGrid.innerHTML = '<p class="text-gray-600">Loading available pools...</p>';
  try {
    const response = await fetch(`${document.getElementById('server-url').value}/available-pools?walletAddress=${walletAddress}`, {
      headers: { 'X-API-Key': DEPLOY_API_KEY }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch available pools');
    }
    const pools = await response.json();
    poolsGrid.innerHTML = '';
    if (Object.keys(pools).length === 0) {
      poolsGrid.innerHTML = '<p class="text-gray-600">No available pools found for your wallet address.</p>';
      return;
    }
    for (const [poolId, pool] of Object.entries(pools)) {
      const poolCard = document.createElement('div');
      poolCard.className = 'pool-card p-6';
      poolCard.innerHTML = `
        <div class="mb-4">
          <h3 class="text-xl font-bold text-gray-900">${pool.name}</h3>
        </div>
        <div class="space-y-3 text-sm text-gray-600 mb-4">
          <div class="flex justify-between items-center">
            <span>Pool ID:</span>
            <div class="flex items-center">
              <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded mr-2">${poolId}</span>
              <button onclick="copyPoolId('${poolId}')" class="text-indigo-500 hover:text-indigo-600 text-xs font-semibold">Copy</button>
            </div>
          </div>
          <div>
            <span class="font-medium">Sponsor Info:</span>
            <p class="text-gray-700 whitespace-pre-wrap">${pool.sponsorInfo}</p>
          </div>
          <div>
            <input type="checkbox" id="terms-${poolId}" class="mr-2">
            <label for="terms-${poolId}" class="text-xs">I accept the <a href="https://terms_enginesoup.ar.io" target="_blank" class="text-indigo-500 hover:underline">terms of service</a></label>
          </div>
        </div>
        <button onclick="joinPool('${poolId}')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Join Pool</button>
      `;
      poolsGrid.appendChild(poolCard);
    }
  } catch (error) {
    poolsGrid.innerHTML = '<p class="text-red-500">Failed to load available pools. Please try again.</p>';
    showToast('Error loading pools: ' + error.message);
  }
}

document.getElementById('connect-wallet').addEventListener('click', async () => {
  try {
    if (window.arweaveWallet) {
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGNATURE']);
      walletAddress = await window.arweaveWallet.getActiveAddress();
      document.getElementById('wallet-status').textContent = `Connected: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
      document.getElementById('connect-wallet').classList.add('hidden');
      document.getElementById('disconnect-wallet').classList.remove('hidden');
      document.getElementById('join-form-section').classList.remove('hidden');
      loadAvailablePools();
    } else {
      showToast('Wander Wallet extension not detected.');
    }
  } catch (error) {
    showToast('Error connecting wallet: ' + error.message);
  }
});

document.getElementById('disconnect-wallet').addEventListener('click', async () => {
  try {
    if (window.arweaveWallet) await window.arweaveWallet.disconnect();
    walletAddress = null;
    document.getElementById('wallet-status').textContent = 'Connect your Arweave wallet to join a pool';
    document.getElementById('connect-wallet').classList.remove('hidden');
    document.getElementById('disconnect-wallet').classList.add('hidden');
    document.getElementById('join-form-section').classList.add('hidden');
    document.getElementById('available-pools').innerHTML = '';
  } catch (error) {
    showToast('Error disconnecting wallet: ' + error.message);
  }
});