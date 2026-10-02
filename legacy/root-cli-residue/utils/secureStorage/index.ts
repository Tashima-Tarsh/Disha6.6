import { createFallbackStorage } from './fallbackStorage.js'
import { macOsKeychainStorage } from './macOsKeychainStorage.js'
import { plainTextStorage } from './plainTextStorage.js'
import { isPlaintextStorageAllowed, plaintextStorageDeniedMessage } from '../../security/secureStoragePolicy.js'
import type { SecureStorage } from './types.js'

/**
 * Get the appropriate secure storage implementation for the current platform
 */
export function getSecureStorage(): SecureStorage {
  if (process.platform === 'darwin') {
    return isPlaintextStorageAllowed()
      ? createFallbackStorage(macOsKeychainStorage, plainTextStorage)
      : macOsKeychainStorage
  }

  // TODO: add libsecret support for Linux

  if (isPlaintextStorageAllowed()) {
    return plainTextStorage
  }

  return {
    name: 'secure-storage-unavailable',
    read: () => null,
    readAsync: async () => null,
    update: () => ({ success: false, warning: plaintextStorageDeniedMessage() }),
    delete: () => true,
  }
}
