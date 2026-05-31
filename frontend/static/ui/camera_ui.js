export function createCameraUI() {
    
    const els = {
        cameraLensTopImage: document.getElementById("camera-lens-top-image"),
        connectionBtn: document.getElementById("connection-btn"),
        connectionBtnText: document.getElementById("text-connection-btn"), 
        connectionBtnSpinner: document.getElementById("spinner-connection-btn"),
        lensesBtn: document.getElementById("lenses-btn"),
        ipBtn: document.getElementById("ip-btn"),
        ipForm: document.getElementById("ip-form"),
        ipInput: document.getElementById("ip"),
        portInput: document.getElementById("port"),
        lensesList: document.getElementById("lenses-list"),
        video: document.getElementById("tv-screen-perspective"),
        currentTime: document.getElementById("current-time"),
        liveTime: document.getElementById("live-time"),
        cameraInfoTime: document.getElementById("camera-info-time"),
        lensesBckdrpContainer: document.getElementById("lenses-bckdrp-container"),
        ipBckdrpContainer: document.getElementById("ip-bckdrp-container"),
        backdrops: document.querySelectorAll(".backdrop"),
    };

    let powerCallback;
    let updateConnectionSettingsCallback;
    let lensCallback;

    let currentStream = null;  // track to stop tracks cleanly

    // timer state
    let seconds = 0;
    let interval = null;

    let cameraOn = false;
    let isLive = false;
    
    const api = {
        onPowerToggle(cb) { powerCallback = cb; },

        onIpFormSave(cb) { updateConnectionSettingsCallback = cb },

        onLensPick(cb) { lensCallback = cb; },

        populateCameras(cameras) {
            els.lensesList.innerHTML = "";
            cameras.forEach((cam, i) => {
                const li = document.createElement("li");
                li.dataset.deviceId = cam.deviceId;
                li.textContent = cam.label || `Camera ${i + 1}`;
                if (i === 0) li.classList.add("selected");
                els.lensesList.appendChild(li);
            });
        },

        getSelectedDeviceId() {
            const selected = els.lensesList.querySelector("li.selected");
            return selected?.dataset.deviceId || null;
        },

        setVideoStream(stream) {
            currentStream = stream;  // keep reference to stop later
            els.video.srcObject = stream;
        },

        stopPreviousStreamTracks() {
            // ... do I need to stop track on lens switch ?
        },

        clearVideo() {
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }
            els.video.srcObject = null;
        },

        async setPower(on) {
            console.log(`setPower: ${on}`);
            els.connectionBtn.disabled = true;
            els.connectionBtn.classList.add('disabled');
            if (on) { 
                els.connectionBtnText.textContent = "PAIRING";
                els.connectionBtnSpinner.classList.remove("hidden");
            }
            await toggleLensOpening(on);
            cameraOn = on;
        },

        setLive(live) {
            console.log(`setLive: ${live}`);
            els.connectionBtn.disabled = false;
            els.connectionBtnSpinner.classList.add("hidden");
            els.connectionBtn.classList.remove('disabled');
            if (live) {
                els.connectionBtnText.textContent = "DISCONNECT";
                els.connectionBtn.classList.add('live');
            }
            else {
                els.connectionBtnText.textContent = "CONNECT";
                els.connectionBtn.classList.remove('live');
            }
            isLive = live;
        },

        startTimer,
        stopTimer,
        startClock
    };

    // Events wiring
    els.connectionBtn.addEventListener("click", async () => {
        const shouldTurnOn = !cameraOn;
        cameraOn = !cameraOn;
        if (powerCallback) powerCallback(shouldTurnOn);
    });

    // Lens overlay toggles backdrop
    els.lensesBtn.addEventListener("click", () => {
        els.lensesBckdrpContainer.classList.toggle("hidden");
    });
    
    // IP related events
    els.ipBtn.addEventListener("click", () => {
        els.ipBckdrpContainer.classList.toggle("hidden");
    });
    els.ipForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const ip = els.ipInput.value;
        const port = els.portInput.value;
        els.ipBckdrpContainer.classList.add("hidden");
        if (updateConnectionSettingsCallback) {
            updateConnectionSettingsCallback(ip, port);
        }
    });

    // Backdrop click outside closes
    els.backdrops.forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) backdrop.classList.add("hidden");
        });
    });


    // Lens selection (UL -> LI)
    els.lensesList.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;

        els.lensesList.querySelectorAll("li").forEach(x => x.classList.remove("selected"));
        li.classList.add("selected");

        els.lensesBckdrpContainer.classList.add("hidden");

        const deviceId = li.dataset.deviceId;
        if (lensCallback) lensCallback(deviceId);
    });

    els.cameraInfoTime.addEventListener("click", () => {
        els.currentTime.classList.toggle('hidden');
        els.liveTime.classList.toggle('hidden');
    });

    // Helpers
    function startTimer() {
        stopTimer();
        seconds = 0;
        els.liveTime.textContent = "--:--:--";
        interval = setInterval(() => {
            seconds++;
            const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
            const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
            const s = String(seconds % 60).padStart(2, "0");
            els.liveTime.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    function stopTimer() {
        if (interval) clearInterval(interval);
        interval = null;
        els.liveTime.textContent = "--:--:--";
    }

    function startClock() {
        function tick() {
            const now = new Date();
            els.currentTime.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
            const msUntilNextSecond = 1000 - now.getMilliseconds();
            setTimeout(tick, msUntilNextSecond);
        }
        tick();
    }

    function toggleLensOpening(on) {
        return new Promise((resolve) => {
            const onEnd = () => {
                els.cameraLensTopImage.removeEventListener("transitionend", onEnd);
                resolve();
            };
            els.cameraLensTopImage.addEventListener("transitionend", onEnd);
            els.cameraLensTopImage.classList.toggle('open', on);
        })
    }

    return api;
}


