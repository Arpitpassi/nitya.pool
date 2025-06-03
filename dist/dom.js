import { isValidArweaveAddress, showToast } from './utils.js';

export function updateWhitelistPreview(textareaId, previewId) {
  const textarea = document.getElementById(textareaId);
  const preview = document.getElementById(previewId);
  const addresses = textarea.value.split('\n').map(a => a.trim()).filter(a => a);
  preview.innerHTML = addresses.map((address) => `
    <div class="address-item ${isValidArweaveAddress(address) ? 'valid' : 'invalid'}">
      <span class="break-all">${address}</span>
    </div>
  `).join('');
}

export function handleWhitelistFile(fileInputId, textareaId) {
  const fileInput = document.getElementById(fileInputId);
  const textarea = document.getElementById(textareaId);
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const addresses = JSON.parse(e.target.result);
        if (!Array.isArray(addresses)) {
          showToast('Invalid JSON: Must be an array of addresses.');
          return;
        }
        textarea.value = addresses.join('\n');
        updateWhitelistPreview(textareaId, `${textareaId}-preview-${fileInputId.includes('edit') ? 'edit' : 'create'}`);
      } catch (error) {
        showToast('Error parsing JSON file: ' + error.message);
      }
    };
    reader.readAsText(file);
  });
}