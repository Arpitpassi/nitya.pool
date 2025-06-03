import { updateWhitelistPreview, handleWhitelistFile } from './dom.js';
import { connectWallet, disconnectWallet } from './wallet.js';
import { fetchSupportLink, createPool, editPoolSubmit, revokeAccess, shareCredits, downloadWallet, deletePoolConfirm, editPool, viewDetails } from './pool.js';

// Expose global functions
window.revokeAccess = revokeAccess;
window.shareCredits = shareCredits;
window.downloadWallet = downloadWallet;
window.deletePoolConfirm = deletePoolConfirm;
window.editPool = editPool;
window.viewDetails = viewDetails;

// Event listeners
document.getElementById('whitelist').addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
document.getElementById('edit-whitelist').addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));
handleWhitelistFile('whitelist-file', 'whitelist');
handleWhitelistFile('edit-whitelist-file', 'edit-whitelist');

document.getElementById('connect-wallet').addEventListener('click', connectWallet);
document.getElementById('disconnect-wallet').addEventListener('click', disconnectWallet);
document.getElementById('support-btn').addEventListener('click', fetchSupportLink);
document.getElementById('create-pool-btn').addEventListener('click', () => {
  document.getElementById('create-modal').classList.remove('hidden');
  updateWhitelistPreview('whitelist', 'whitelist-preview-create');
});
document.getElementById('cancel-create').addEventListener('click', () => {
  document.getElementById('create-modal').classList.add('hidden');
  document.getElementById('create-pool-form').reset();
  document.getElementById('whitelist-preview-create').innerHTML = '';
});
document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
  document.getElementById('edit-pool-form').reset();
  document.getElementById('whitelist-preview-edit').innerHTML = '';
});
document.getElementById('close-details').addEventListener('click', () => {
  document.getElementById('details-modal').classList.add('hidden');
});
document.getElementById('create-pool-form').addEventListener('submit', createPool);
document.getElementById('edit-pool-form').addEventListener('submit', editPoolSubmit);
document.getElementById('close-edit-modal').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
  document.getElementById('edit-pool-form').reset();
  document.getElementById('whitelist-preview-edit').innerHTML = '';
});
document.getElementById('close-create-modal').addEventListener('click', () => {
  document.getElementById('create-modal').classList.add('hidden');
  document.getElementById('create-pool-form').reset();
  document.getElementById('whitelist-preview-create').innerHTML = '';
});