import { showToast, isValidArweaveAddress } from './utils.js';
import { createPool, editPoolSubmit } from './poolManagement.js';

export function updateWhitelistPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  const addresses = input.value.split('\n').map(a => a.trim()).filter(a => a);
  preview.innerHTML = addresses.map(address => {
    const isValid = isValidArweaveAddress(address);
    return `<div class="${isValid ? 'valid text-green-600' : 'invalid text-red-600'} break-all">${address}</div>`;
  }).join('');
}

export function initializeModalListeners() {
  const createPoolBtn = document.getElementById('create-pool-btn');
  const closeCreateModal = document.getElementById('close-create-modal');
  const cancelCreate = document.getElementById('cancel-create');
  const createSubmitBtn = document.getElementById('create-submit-btn');
  const closeEditModal = document.getElementById('close-edit-modal');
  const cancelEdit = document.getElementById('cancel-edit');
  const editSubmitBtn = document.getElementById('edit-submit-btn');

  if (createPoolBtn) {
    createPoolBtn.addEventListener('click', () => {
      document.getElementById('create-modal').classList.remove('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (closeCreateModal) {
    closeCreateModal.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (cancelCreate) {
    cancelCreate.addEventListener('click', () => {
      document.getElementById('create-modal').classList.add('hidden');
      document.getElementById('create-pool-form').reset();
      document.getElementById('whitelist-preview-create').innerHTML = '';
    });
  }
  if (createSubmitBtn) {
    createSubmitBtn.addEventListener('click', createPool);
  }
  if (closeEditModal) {
    closeEditModal.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-pool-form').reset();
      document.getElementById('whitelist-preview-edit').innerHTML = '';
    });
  }
  if (editSubmitBtn) {
    editSubmitBtn.addEventListener('click', editPoolSubmit);
  }

  // Whitelist file input handling
  const whitelistFileInput = document.getElementById('whitelist-file');
  const editWhitelistFileInput = document.getElementById('edit-whitelist-file');

  if (whitelistFileInput) {
    whitelistFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const addresses = JSON.parse(e.target.result);
            if (!Array.isArray(addresses)) {
              showToast('Invalid JSON format: Must be an array of addresses.');
              return;
            }
            const invalidAddresses = addresses.filter(a => !isValidArweaveAddress(a));
            if (invalidAddresses.length > 0) {
              showToast('Invalid addresses found in file: ' + invalidAddresses.join(', '));
              return;
            }
            document.getElementById('whitelist').value = addresses.join('\n');
            updateWhitelistPreview('whitelist', 'whitelist-preview-create');
          } catch (error) {
            showToast('Error parsing JSON file: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  if (editWhitelistFileInput) {
    editWhitelistFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const addresses = JSON.parse(e.target.result);
            if (!Array.isArray(addresses)) {
              showToast('Invalid JSON format: Must be an array of addresses.');
              return;
            }
            const invalidAddresses = addresses.filter(a => !isValidArweaveAddress(a));
            if (invalidAddresses.length > 0) {
              showToast('Invalid addresses found in file: ' + invalidAddresses.join(', '));
              return;
            }
            document.getElementById('edit-whitelist').value = addresses.join('\n');
            updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit');
          } catch (error) {
            showToast('Error parsing JSON file: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Real-time whitelist preview updates
  const whitelistInput = document.getElementById('whitelist');
  const editWhitelistInput = document.getElementById('edit-whitelist');

  if (whitelistInput) {
    whitelistInput.addEventListener('input', () => updateWhitelistPreview('whitelist', 'whitelist-preview-create'));
  }
  if (editWhitelistInput) {
    editWhitelistInput.addEventListener('input', () => updateWhitelistPreview('edit-whitelist', 'whitelist-preview-edit'));
  }
}

// Initialize modal listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeModalListeners);