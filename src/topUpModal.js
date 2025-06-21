import { showToast } from './utils.js';
import { walletAddress } from './wallet.js';
import { reloadPoolDetails } from './poolDetails.js';
import { getCurrentEditPoolId, DEPLOY_API_KEY } from './pools.js';

export async function openTopUpModal(poolId) {
  const currentEditPoolId = getCurrentEditPoolId();
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
  modal.className = 'fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="modal-content p-8 relative">
      <button id="close-topup-modal" class="close-btn">×</button>
      <h3 class="modal-title">TOP UP POOL</h3>
      <form id="topup-form">
        <input type="hidden" id="topup-pool-id" value="${poolId}">
        <div class="form-group">
          <label class="form-label" for="topup-password">POOL PASSWORD</label>
          <input type="password" id="topup-password" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="topup-amount">AR AMOUNT</label>
          <input type="number" id="topup-amount" step="0.000000000001" min="0" class="form-input" required>
          <button type="button" id="use-max-ar" class="btn-secondary" style="margin-top: 10px;">USE MAX AR</button>
          <p id="estimated-credits" style="font-size: 12px; color: #666; margin-top: 5px;">Estimated Turbo Credits: 0</p>
        </div>
        <div style="display: flex; gap: 15px;">
          <button type="submit" id="topup-submit" class="btn-primary" style="flex: 1;">SUBMIT</button>
          <button type="button" id="cancel-topup" class="btn-secondary">CANCEL</button>
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
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    loadingOverlay.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border: 3px solid #000000;
        text-align: center;
      ">
        <div style="
          border: 4px solid #f3f3f3;
          border-top: 4px solid #000000;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
        <p style="margin-top: 10px; font-family: 'JetBrains Mono', monospace;">Processing Top-Up...</p>
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
      showToast(`Error topping up pool: ${error.message}`);
    }
  });

  // Add event listeners for cancel/close
  const handleClose = () => {
    modal.remove();
  };
  cancelTopUpButton.addEventListener('click', handleClose);
  closeTopUpButton.addEventListener('click', handleClose);
}