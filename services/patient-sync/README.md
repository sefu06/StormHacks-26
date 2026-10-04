# Patient data synchronization

This scheduled worker imports authorized patient data from supported sources and normalizes it through the API. Keep it separate from the bedside voice process so a sync failure cannot stop reminders.

Use an official integration or an explicitly authorized automation flow for each source. Cache normalized records in the backend and record the source and synchronization time.
