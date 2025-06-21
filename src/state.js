let currentEditPoolId = null;
let poolDataMap = new Map();

export function getCurrentEditPoolId() {
  return currentEditPoolId;
}

export function setCurrentEditPoolId(poolId) {
  currentEditPoolId = poolId;
}

export function getPoolDataMap() {
  return poolDataMap;
}