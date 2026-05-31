import { createCameraUI } from "./ui/camera_ui.js";
// import { initBatteryUI } from "./ui/battery_ui.js";
import { listCameras, getCameraStream } from "./webrtc/cameras.js";
import { createStreamer } from "./webrtc/streamer.js";


const sessionId = crypto.randomUUID();

// init UI + battery
const ui = createCameraUI();
ui.startClock();
// initBatteryUI();

// init streamer (WebRTC client)
const streamer = createStreamer({
    sessionId,
    onTrackReady: () => {
        ui.setLive(true);
        ui.startTimer();
    },
    onInactive: async () => {
        await stopFlow();
    },
});

// populate camera list
(async () => {
    const cameras = await listCameras();  // requests permission + enumerate
    ui.populateCameras(cameras);
})();

// UI events (power + lens selection)
ui.onPowerToggle(async (shouldTurnOn) => {
    if (shouldTurnOn) await startFlow();
    else await stopFlow();
});

// Update connection settings from IP form
ui.onIpFormSave((ip, port) => {
    streamer.updateConnectionSettings(ip, port);
});

ui.onLensPick(async (deviceId) => {
    if (!streamer.isRunning()) return;

    // get a new stream for that device and replace track in PeerConnection
    const newStream = await getCameraStream({ deviceId });
    ui.setVideoStream(newStream);

    const newTrack = newStream.getVideoTracks()[0];
    await streamer.replaceVideoTrack(newTrack);

    // here I could stop old tracks after replacement...
    // NOTE: needed?
    ui.stopPreviousStreamTracks(newStream);
});

// start/stop flows
async function startFlow() {
    ui.setPower(true);
    const deviceId = ui.getSelectedDeviceId();
    const stream = await getCameraStream({ deviceId });

    ui.setVideoStream(stream);
    await streamer.start(stream);
}

async function stopFlow() {
    await streamer.stop();
    ui.stopTimer();
    ui.clearVideo();
    ui.setPower(false);
    ui.setLive(false);
}
