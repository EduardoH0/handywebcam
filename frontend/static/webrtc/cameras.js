// TODO: ideally should be able to modify this
const DEFAULT_CONSTRAINTS = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60, max: 60},
}

export async function listCameras() {
    // Ask for permissions first (so labels appear)
    await navigator.mediaDevices.getUserMedia({ video: true });

    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === "videoinput")
}

export async function getCameraStream({ deviceId } = {}) {
    const videoConstraints = { ...DEFAULT_CONSTRAINTS };

    if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId }
    }

    return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
    });
}
