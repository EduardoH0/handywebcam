export function initBatteryUI() {
    const batteryBars = document.querySelectorAll('.battery-bar');
    
    // Check if the Battery API is supported in the current browser
    // NOTE: (IOS does not support)
    if ('getBattery' in navigator || 'battery' in navigator) {
        const batteryPromise = navigator.getBattery ? navigator.getBattery() : navigator.battery; 

        batteryPromise.then((battery) => {
            updateBatteryInfo(battery, batteryBars);

            battery.addEventListener('levelchange', () => {
                updateBatteryInfo(battery, batteryBars);
            });

            // battery.addEventListener('chargingchange', () => { ...
        });
    } else {
        // Could show a placeholder of battery...
    }
}

function updateBatteryInfo(battery, batteryBars) {
    batteryBars.forEach(bar => {
        const level = parseInt(bar.dataset.level, 10);
        if (level > battery.level * 100) {
            bar.classList.add('hidden'); 
        } else {
            bar.classList.remove('hidden');
        }
    });
}
