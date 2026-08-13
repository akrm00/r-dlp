//! Tracks in-flight downloads so they can be capped, cancelled and paused.
//!
//! The registry is Tauri managed state: every `download_video` invocation registers
//! itself here before queuing, and unregisters on every exit path.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{watch, Mutex, OwnedSemaphorePermit, Semaphore};

/// How many downloads may transfer bytes at the same time. Extra downloads wait
/// in the queue and start automatically as slots free up.
pub const MAX_CONCURRENT_DOWNLOADS: usize = 3;

/// Why a running download is being stopped. A stop is a user action, never an error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StopReason {
    /// Discard the partial file.
    Cancel,
    /// Keep the partial file so the download can be resumed later.
    Pause,
}

pub type StopReceiver = watch::Receiver<Option<StopReason>>;

pub struct DownloadRegistry {
    slots: Arc<Semaphore>,
    entries: Mutex<HashMap<String, watch::Sender<Option<StopReason>>>>,
}

impl DownloadRegistry {
    pub fn new() -> Self {
        Self {
            slots: Arc::new(Semaphore::new(MAX_CONCURRENT_DOWNLOADS)),
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Make a download stoppable. Called before queuing so a download that is still
    /// waiting for a slot can be cancelled too.
    ///
    /// Registering an id that is already present replaces the previous entry, which
    /// leaves the older run unstoppable; callers must use a fresh id per run.
    pub async fn register(&self, download_id: &str) -> StopReceiver {
        let (sender, receiver) = watch::channel(None);
        self.entries
            .lock()
            .await
            .insert(download_id.to_string(), sender);
        receiver
    }

    pub async fn unregister(&self, download_id: &str) {
        self.entries.lock().await.remove(download_id);
    }

    /// Signal a download to stop. Returns `false` when the id is unknown, which
    /// means the download already finished.
    pub async fn stop(&self, download_id: &str, reason: StopReason) -> bool {
        match self.entries.lock().await.get(download_id) {
            Some(sender) => sender.send(Some(reason)).is_ok(),
            None => false,
        }
    }

    /// Wait for a concurrency slot. The permit is released when it is dropped, so
    /// holding it for the lifetime of the yt-dlp process is what caps concurrency.
    pub async fn acquire_slot(&self) -> Option<OwnedSemaphorePermit> {
        Arc::clone(&self.slots).acquire_owned().await.ok()
    }
}

impl Default for DownloadRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Resolve once this download has been asked to stop.
///
/// Stays pending forever when the registry entry disappears, so callers can safely
/// select on it against the future they actually want to interrupt.
pub async fn wait_for_stop(stop_rx: &mut StopReceiver) -> StopReason {
    loop {
        if let Some(reason) = *stop_rx.borrow_and_update() {
            return reason;
        }
        if stop_rx.changed().await.is_err() {
            std::future::pending::<()>().await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn stopping_an_unknown_download_reports_failure() {
        let registry = DownloadRegistry::new();

        assert!(!registry.stop("missing", StopReason::Cancel).await);
    }

    #[tokio::test]
    async fn a_registered_download_receives_its_stop_reason() {
        let registry = DownloadRegistry::new();
        let mut receiver = registry.register("one").await;

        assert!(registry.stop("one", StopReason::Pause).await);

        receiver.changed().await.expect("sender should be alive");
        assert_eq!(*receiver.borrow(), Some(StopReason::Pause));
    }

    #[tokio::test]
    async fn an_unregistered_download_can_no_longer_be_stopped() {
        let registry = DownloadRegistry::new();
        registry.register("one").await;
        registry.unregister("one").await;

        assert!(!registry.stop("one", StopReason::Cancel).await);
    }

    #[tokio::test]
    async fn concurrency_is_capped_at_the_slot_count() {
        let registry = DownloadRegistry::new();

        let mut permits = Vec::new();
        for _ in 0..MAX_CONCURRENT_DOWNLOADS {
            permits.push(registry.acquire_slot().await.expect("slot available"));
        }

        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(50), registry.acquire_slot())
                .await
                .is_err(),
            "an extra download must wait for a slot"
        );

        permits.pop();
        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(50), registry.acquire_slot())
                .await
                .is_ok(),
            "releasing a permit must let a queued download start"
        );
    }
}
