import { updateWhitelistPreview, handleWhitelistFile } from './dom.js';
import { showWalletChoiceModal, connectWithStrategy, disconnectWallet, browserWalletStrategy, beaconStrategy } from './wallet.js';
import { fetchSupportLink, createPool, editPoolSubmit, revokeAccess, shareCredits, downloadWallet, deletePoolConfirm, editPool, viewDetails } from './pool.js';
import '@arweave-wallet-kit/styles/dist/modal/modal.module.css';
import '@arweave-wallet-kit/styles/dist/button/button.module.css';

// Expose global functions
window.revokeAccess = revokeAccess;
window.shareCredits = shareCredits;
window.downloadWallet = downloadWallet;
window.deletePoolConfirm = deletePoolConfirm;
window.editPool = editPool;
window.viewDetails = viewDetails;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, attaching event listeners');

  // Wallet connection listeners
  const connectWalletBtn = document.getElementById('connect-wallet');
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
      console.log('Connect Wallet button clicked');
      showWalletChoiceModal();
    });
  } else {
    console.error('Connect Wallet button not found');
  }

  const disconnectWalletBtn = document.getElementById('disconnect-wallet');
  if (disconnectWalletBtn) {
    disconnectWalletBtn.addEventListener('click', () => {
      console.log('Disconnect Wallet button clicked');
      disconnectWallet();
    });
  } else {
    console.error('Disconnect Wallet button not found');
  }

  const connectBrowserWalletBtn = document.getElementById('connect-browser-wallet');
  if (connectBrowserWalletBtn) {
    connectBrowserWalletBtn.addEventListener('click', () => {
      console.log('Connect Browser Wallet button clicked');
      connectWithStrategy(browserWalletStrategy);
    });
  } else {
    console.error('Connect Browser Wallet button not found');
  }

  const connectBeaconBtn = document.getElementById('connect-beacon');
  if (connectBeaconBtn) {
    connectBeaconBtn.addEventListener('click', () => {
      console.log('Connect Beacon button clicked');
      connectWithStrategy(beaconStrategy);
    });
  } else {
    console.error('Connect Beacon button not found');
  }

  const cancelConnectBtn = document.getElementById('cancel-connect');
  if (cancelConnectBtn) {
    cancelConnectBtn.addEventListener('click', () => {
      console.log('Cancel Connect button clicked');
      document.getElementById('wallet-choice-modal').classList.add('hidden');
    });
  } else {
    console.error('Cancel Connect button not found');
  }

  // Other event listeners
  document.getElementById('whitelist').addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
  document.getElementById('edit-whitelist').addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));
  handleWhitelistFile('whitelist-file', 'whitelist');
  handleWhitelistFile('edit-whitelist-file', 'edit-whitelist');

  const supportBtn = document.getElementById('support-btn');
  if (supportBtn) {
    supportBtn.addEventListener('click', fetchSupportLink);
  }

  const createPoolBtn = document.getElementById('create-pool-btn');
  if (createPoolBtn) {
    createPoolBtn.addEventListener('click', () => {
      document.getElementById('create-modal').classList.remove('hidden');
      updateWhitelistPreview('whitelist', 'whitelist-preview-create');
    });
  }

  const cancelCreateBtn = document.getElementById('cancel-create');
  if (cancelCreateBtn) {
    cancelCreateBtn.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }

  const cancelEditBtn = document.getElementById('cancel-edit');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }

  const closeDetailsBtn = document.getElementById('close-details');
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
      document.getElementById('details-modal').classList.add('hidden');
    });
  }

  const createPoolForm = document.getElementById('create-pool-form');
  if (createPoolForm) {
    createPoolForm.addEventListener('submit', createPool);
  }

  const editPoolForm = document.getElementById('edit-pool-form');
  if (editPoolForm) {
    editPoolForm.addEventListener('submit', editPoolSubmit);
  }

  const closeEditModalBtn = document.getElementById('close-edit-modal');
  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }

  const closeCreateModalBtn = document.getElementById('close-create-modal');
  if (closeCreateModalBtn) {
    closeCreateModalBtn.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
});