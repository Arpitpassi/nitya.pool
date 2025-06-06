import { resetPoolsOnDisconnect } from './pool-utils.js';
import { fetchSupportLink, loadPools } from './pool-fetch.js';
import { createPool } from './pool-create.js';
import { editPool, editPoolSubmit } from './pool-edit.js';
import { sponsorCredits, revokeCredits, revokeAccess, shareCredits, downloadWallet, deletePoolConfirm } from './pool-actions.js';
import { viewDetails, initializeModalListeners } from './pool-ui.js';

export {
  resetPoolsOnDisconnect,
  fetchSupportLink,
  createPool,
  editPool,
  editPoolSubmit,
  sponsorCredits,
  revokeCredits,
  revokeAccess,
  shareCredits,
  downloadWallet,
  deletePoolConfirm,
  viewDetails,
  loadPools
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeModalListeners();
  loadPools();
});

// Handle wallet disconnection event
document.addEventListener('walletDisconnected', () => {
  console.log('walletDisconnected event caught, refreshing pools');
  loadPools();
});