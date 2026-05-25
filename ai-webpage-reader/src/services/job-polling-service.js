/**
 * Job Polling Service
 * Polls backend for job completion status
 */

let JobPollingService = {
    // Active polling intervals
    activePolls: new Map(),

    // Default polling interval (3 seconds)
    pollInterval: 3000,

    // Maximum polling time (5 minutes)
    maxPollTime: 5 * 60 * 1000,

    /**
     * Start polling for a job
     * @param {string} jobId - Job ID to poll
     * @param {function} onComplete - Callback when job completes
     * @param {function} onError - Callback on error
     */
    startPolling(jobId, onComplete, onError) {
        if (this.activePolls.has(jobId)) {
            console.log('Already polling job:', jobId);
            return;
        }

        console.log('🔄 Starting to poll job:', jobId);

        const startTime = Date.now();

        const poll = async () => {
            try {
                // Check if we've exceeded max poll time
                if (Date.now() - startTime > this.maxPollTime) {
                    console.warn('⏱️ Max poll time exceeded for job:', jobId);
                    this.stopPolling(jobId);
                    if (onError) {
                        onError(new Error('Job polling timeout'));
                    }
                    return;
                }

                // Check job status
                const response = await APIService.getJobStatus(jobId);

                if (!response.success) {
                    console.error('❌ Failed to get job status:', response.error);
                    return; // Continue polling
                }

                const { state, summary } = response.data;

                console.log(`📊 Job ${jobId} state:`, state);

                // Handle different states
                switch (state) {
                    case 'completed':
                        console.log('✅ Job completed:', jobId);
                        this.stopPolling(jobId);
                        if (onComplete) {
                            onComplete(summary);
                        }
                        break;

                    case 'failed':
                        console.error('❌ Job failed:', jobId);
                        this.stopPolling(jobId);
                        if (onError) {
                            onError(new Error('Job failed'));
                        }
                        break;

                    case 'waiting':
                    case 'active':
                    case 'delayed':
                        // Still processing, continue polling
                        console.log('⏳ Job still processing...');
                        break;

                    default:
                        console.warn('Unknown job state:', state);
                }

            } catch (error) {
                console.error('❌ Polling error:', error);
                // Don't stop polling on network errors, just continue
            }
        };

        // Start polling immediately
        poll();

        // Set up interval
        const intervalId = setInterval(poll, this.pollInterval);

        // Store interval ID
        this.activePolls.set(jobId, intervalId);
    },

    /**
     * Stop polling for a job
     * @param {string} jobId - Job ID
     */
    stopPolling(jobId) {
        const intervalId = this.activePolls.get(jobId);
        if (intervalId) {
            clearInterval(intervalId);
            this.activePolls.delete(jobId);
            console.log('🛑 Stopped polling job:', jobId);
        }
    },

    /**
     * Stop all active polls
     */
    stopAllPolling() {
        for (const [jobId, intervalId] of this.activePolls.entries()) {
            clearInterval(intervalId);
            console.log('🛑 Stopped polling job:', jobId);
        }
        this.activePolls.clear();
    },

    /**
     * Check if a job is being polled
     * @param {string} jobId - Job ID
     * @returns {boolean}
     */
    isPolling(jobId) {
        return this.activePolls.has(jobId);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.JobPollingService = JobPollingService;
}

// Clean up on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        JobPollingService.stopAllPolling();
    });
}