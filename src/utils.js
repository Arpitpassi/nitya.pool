export function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function localToZulu(localDateTime) {
  return new Date(localDateTime).toISOString();
}

export function zuluToLocal(zuluString) {
  const date = new Date(zuluString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDisplayTime(zuluString) {
  return new Date(zuluString).toLocaleString();
}

export function isValidArweaveAddress(address) {
  return /^[a-zA-Z0-9_-]{43}$/.test(address.trim());
}