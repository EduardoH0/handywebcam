export function createStreamer({ sessionId, onTrackReady, onActive, onInactive } = {}) {

    const params = new URLSearchParams(window.location.search);
    let ip = params.get("ip");
    let port = params.get("port") ?? "5005";

    // Update ip form values
    const ipInput = document.getElementById("ip");
    const portInput = document.getElementById("port");
    ipInput.value = ip;
    portInput.value = port;

    let WSBASE = `wss://${ip}:${port}`
    let APIBASE = `https://${ip}:${port}`;

    let pc = null;
    let ws = null;
    let running = false;
    let state = null;  // avoid race conditions between webrtc/socket

    function isRunning() {
        return running && pc !== null;
    }

    function updateConnectionSettings(newbackend, newport) {
        ip = newbackend;
        port = newport;
        WSBASE = `wss://${ip}:${port}`
        APIBASE = `https://${ip}:${port}`;
    }

    async function start(stream) {
        try {
            if (pc) await pc.stop();

            // Websocket for server notifications 
            ws = new WebSocket(`${WSBASE}/ws?session_id=${sessionId}`);
            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === "track_ready") {
                    // ws is usually registered slower than track is ready, so ws "track_ready" most likely wont arrive
                    if (state !== "track_ready") {
                        // state = "track_ready";
                        // onTrackReady?.()
                    }
                }
                if (msg.type === "active") {
                    onActive?.()
                }
                if (msg.type === "inactive") {
                    if (state !== "disconnected") {
                        state = "disconnected";
                        onInactive?.();
                    };
                }
            }

            pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                bundlePolicy: "max-bundle"  // reduce latency
            });

            pc.onconnectionstatechange = () => {
                console.log("Connection state:", pc.connectionState);
                // PC connected doesn't necessarily mean that track is ready, but good enough...
                if (pc.connectionState === "connected") {
                    if (state !== "track_ready")
                        state = "track_ready";
                        onTrackReady?.();
                };
                // Slower than socket...
                if (pc.connectionState === "disconnected") {
                    if (state !== "disconnected") {
                        state = "disconnected";
                        onInactive?.();
                    }
                }
            };
            pc.oniceconnectionstatechange = () => console.log("ICE state:", pc.iceConnectionState);
            
            // Add tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // ICE candidates -> Server
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    fetch(`${APIBASE}/candidate`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            session_id: sessionId,
                            candidate: event.candidate
                        })
                    }).catch(err => console.warn("candidate send failed: ", err));
                }
            };


            // Offer/Answer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const response = await fetch(`${APIBASE}/offer`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    session_id: sessionId,
                    sdp: pc.localDescription.sdp,
                    type: pc.localDescription.type
                })
            });

            if (!response.ok) {
                throw new Error (`Offer failed: ${response.status}`);
            }

            const answer = await response.json();
            await pc.setRemoteDescription(answer);

            running = true;
            console.log("Streaming started");
        }
        catch (err) {
            console.error("streamer start() failed:", err);
            state = "disconnected";
            onInactive?.();

            ws?.close();
            pc?.close();

            throw err;
        }
    }

    async function replaceVideoTrack(newTrack) {
        if (!pc) return;

        const sender = pc.getSenders().find(s => s.track.kind === "video");
        if (!sender) throw new Error("No video sender found");
        await sender.replaceTrack(newTrack);
    }

    async function stop() {
        running = false;
        
        if (pc) {
            pc.onicecandidate = null;  // Stop sending ICE candidates
            try { pc.close(); } catch {};  // Close peer connection
            pc = null;
        }

        if (ws) {
            try { ws.close(); } catch {};
            ws = null;
        }
        
        // TODO: stram no longer available here. Double check whether should be stopped.
        // if (stream) {
        //     stream.getTracks().forEach(track => { track.stop(); });  // Stop all media tracks
        //     stream = null;
        // }

        console.log("Streaming stopped");
    }

    return {
        start, 
        stop,
        updateConnectionSettings,
        replaceVideoTrack,
        isRunning
    };
}
