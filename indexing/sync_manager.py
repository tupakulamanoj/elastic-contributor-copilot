"""
Start this alongside webhook_listener.py.
It manages the incremental polling loop and schedules the nightly reconcile.

Usage:
  python sync_manager.py
"""

import time
import threading
import schedule
from datetime import datetime
from indexing.incremental_sync import run_incremental_sync
from indexing.nightly_reconcile import run_reconcile

def start_incremental_loop():
    """Runs every 15 minutes in a background thread."""
    while True:
        try:
            run_incremental_sync()
        except Exception as e:
            print(f"[sync] Incremental sync error: {e}")
        time.sleep(900)   # 15 minutes

def start_nightly_reconcile():
    """Schedules the reconcile at 2am every night."""
    schedule.every().day.at("02:00").do(run_reconcile)
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Sync manager starting...")

    # Run incremental sync immediately on startup
    print("Running initial sync to catch up since last run...")
    run_incremental_sync()

    # Start incremental loop in background thread
    inc_thread = threading.Thread(
        target=start_incremental_loop,
        daemon=True,
        name="incremental-sync"
    )
    inc_thread.start()
    print("Incremental sync loop started (every 15 minutes)")

    # Start nightly reconcile scheduler in background thread
    rec_thread = threading.Thread(
        target=start_nightly_reconcile,
        daemon=True,
        name="nightly-reconcile"
    )
    rec_thread.start()
    print("Nightly reconcile scheduled (2:00 AM daily)")

    print("\nSync manager running. Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nSync manager stopped.")