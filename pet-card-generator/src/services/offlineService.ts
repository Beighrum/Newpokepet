interface OfflineQueueItem {
  id: string;
  timestamp: number;
  type: 'api-call' | 'file-upload' | 'data-sync' | 'custom';
  data: any;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

interface OfflineConfig {
  enableQueue?: boolean;
  maxQueueSize?: number;
  syncInterval?: number;
  retryDelay?: number;
  maxRetries?: number;
  enableNotifications?: boolean;
  enableCaching?: boolean;
  cachePrefix?: string;
}

interface OfflineStatus {
  isOnline: boolean;
  lastOnlineTime: number;
  lastOfflineTime: number;
  queueSize: number;
  pendingSyncs: number;
  connectionType?: string;
  effectiveType?: string;
}

class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private queue: OfflineQueueItem[] = [];
  private config: Required<OfflineConfig>;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: OfflineStatus) => void> = new Set();
  private lastOnlineTime: number = Date.now();
  private lastOfflineTime: number = 0;

  constructor(config: OfflineConfig = {}) {
    this.config = {
      enableQueue: true,
      maxQueueSize: 100,
      syncInterval: 30000, // 30 seconds
      retryDelay: 5000,
      maxRetries: 3,
      enableNotifications: true,
      enableCaching: true,
      cachePrefix: 'offline_cache_',
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Load queue from storage
    this.loadQueue();

    // Start sync interval if online
    if (this.isOnline) {
      this.startSyncInterval();
    }

    // Monitor connection quality
    this.monitorConnection();
  }

  // Add item to offline queue
  queueItem(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): string {
    if (!this.config.enableQueue) {
      throw new Error('Offline queue is disabled');
    }

    const queueItem: OfflineQueueItem = {
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      ...item
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low priority items
      this.queue = this.queue.filter(item => item.priority !== 'low').slice(-(this.config.maxQueueSize - 1));
    }

    this.queue.push(queueItem);
    this.saveQueue();
    this.notifyListeners();

    return queueItem.id;
  }

  // Execute API call with offline support
  async executeWithOfflineSupport<T>(
    fn: () => Promise<T>,
    fallbackData?: T,
    queueData?: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<T> {
    if (this.isOnline) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        // If request fails and we're still online, it might be a server error
        if (this.isOnline && queueData) {
          this.queueItem(queueData);
        }
        
        if (fallbackData !== undefined) {
          return fallbackData;
        }
        
        throw error;
      }
    } else {
      // We're offline
      if (queueData) {
        this.queueItem(queueData);
      }
      
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      
      throw new Error('Operation requires internet connection');
    }
  }

  // Cache data for offline use
  cacheData(key: string, data: any, ttl?: number): void {
    if (!this.config.enableCaching) return;

    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 24 * 60 * 60 * 1000 // Default 24 hours
    };

    try {
      localStorage.setItem(
        `${this.config.cachePrefix}${key}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  // Get cached data
  getCachedData<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    try {
      const cached = localStorage.getItem(`${this.config.cachePrefix}${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        localStorage.removeItem(`${this.config.cachePrefix}${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  // Clear cached data
  clearCache(pattern?: string): void {
    if (!this.config.enableCaching) return;

    const keys = Object.keys(localStorage);
    const prefix = this.config.cachePrefix;

    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Get offline status
  getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      lastOnlineTime: this.lastOnlineTime,
      lastOfflineTime: this.lastOfflineTime,
      queueSize: this.queue.length,
      pendingSyncs: this.queue.filter(item => item.retryCount < item.maxRetries).length,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveType()
    };
  }

  // Subscribe to status changes
  subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Send initial status
    listener(this.getStatus());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Manually trigger sync
  async sync(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    const itemsToSync = [...this.queue].sort((a, b) => {
      // Sort by priority and timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.timestamp - b.timestamp;
    });

    for (const item of itemsToSync) {
      if (item.retryCount >= item.maxRetries) {
        this.removeFromQueue(item.id);
        continue;
      }

      try {
        await this.syncItem(item);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.warn('Failed to sync item:', error);
        item.retryCount++;
        
        if (item.retryCount >= item.maxRetries) {
          this.removeFromQueue(item.id);
        }
      }
    }

    this.saveQueue();
    this.notifyListeners();
  }

  // Get queue items
  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  // Remove item from queue
  removeFromQueue(id: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== id);
    
    if (this.queue.length !== initialLength) {
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    
    return false;
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
  }

  // Destroy service
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  // Handle online event
  private handleOnline = (): void => {
    this.isOnline = true;
    this.lastOnlineTime = Date.now();
    
    if (this.config.enableNotifications) {
      this.showNotification('Back online', 'Connection restored. Syncing pending changes...');
    }
    
    this.startSyncInterval();
    this.sync();
    this.notifyListeners();
  };

  // Handle offline event
  private handleOffline = (): void => {
    this.isOnline = false;
    this.lastOfflineTime = Date.now();
    
    if (this.config.enableNotifications) {
      this.showNotification('Gone offline', 'Changes will be saved and synced when connection is restored.');
    }
    
    this.stopSyncInterval();
    this.notifyListeners();
  };

  // Start sync interval
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.config.syncInterval);
  }

  // Stop sync interval
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync individual item
  private async syncItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case 'api-call':
        await this.syncApiCall(item);
        break;
      case 'file-upload':
        await this.syncFileUpload(item);
        break;
      case 'data-sync':
        await this.syncData(item);
        break;
      case 'custom':
        await this.syncCustom(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Sync API call
  private async syncApiCall(item: OfflineQueueItem): Promise<void> {
    if (!item.url) {
      throw new Error('API call requires URL');
    }

    const response = await fetch(item.url, {
      method: item.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...item.headers
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
  }

  // Sync file upload
  private async syncFileUpload(item: OfflineQueueItem): Promise<void> {
    if (!item.url) {
      throw new Error('File upload requires URL');
    }

    const formData = new FormData();
    Object.entries(item.data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(item.url, {
      method: 'POST',
      headers: item.headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
  }

  // Sync data
  private async syncData(item: OfflineQueueItem): Promise<void> {
    // Implement data synchronization logic
    console.log('Syncing data:', item.data);
  }

  // Sync custom item
  private async syncCustom(item: OfflineQueueItem): Promise<void> {
    // Custom sync logic can be implemented here
    console.log('Syncing custom item:', item.data);
  }

  // Save queue to storage
  private saveQueue(): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  // Load queue from storage
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('offline_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  // Notify listeners
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.warn('Error in offline status listener:', error);
      }
    });
  }

  // Show notification
  private showNotification(title: string, message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }

  // Monitor connection quality
  private monitorConnection(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.notifyListeners();
      });
    }
  }

  // Get connection type
  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      return (navigator as any).connection?.type;
    }
    return undefined;
  }

  // Get effective connection type
  private getEffectiveType(): string | undefined {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType;
    }
    return undefined;
  }

  // Generate unique ID
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// React hook for offline functionality
export const useOffline = (config?: OfflineConfig) => {
  const [offlineService] = React.useState(() => new OfflineService(config));
  const [status, setStatus] = React.useState<OfflineStatus>(offlineService.getStatus());

  React.useEffect(() => {
    const unsubscribe = offlineService.subscribe(setStatus);
    return unsubscribe;
  }, [offlineService]);

  React.useEffect(() => {
    return () => {
      offlineService.destroy();
    };
  }, [offlineService]);

  const executeWithOfflineSupport = React.useCallback(<T>(
    fn: () => Promise<T>,
    fallbackData?: T,
    queueData?: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ) => {
    return offlineService.executeWithOfflineSupport(fn, fallbackData, queueData);
  }, [offlineService]);

  return {
    status,
    isOnline: status.isOnline,
    queueSize: status.queueSize,
    executeWithOfflineSupport,
    queueItem: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => 
      offlineService.queueItem(item),
    sync: () => offlineService.sync(),
    cacheData: (key: string, data: any, ttl?: number) => 
      offlineService.cacheData(key, data, ttl),
    getCachedData: <T>(key: string) => offlineService.getCachedData<T>(key),
    clearCache: (pattern?: string) => offlineService.clearCache(pattern),
    getQueue: () => offlineService.getQueue(),
    clearQueue: () => offlineService.clearQueue()
  };
};

// Export singleton instance
export const offlineService = new OfflineService();
export { OfflineService };
export default offlineService;