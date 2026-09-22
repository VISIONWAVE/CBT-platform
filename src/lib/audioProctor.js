let audioContext = null;
let analyser = null;
let microphoneSource = null;
let animationFrame = null;

let monitoring = false;
let calibrationSamples = [];
let calibrationComplete = false;
let noiseFloor = 0;

let sustainedStart = 0;
let lastTrigger = 0;

const CALIBRATION_TIME = 1500;
const SUSTAINED_TIME = 900;
const COOLDOWN_TIME = 5000;

const MIN_THRESHOLD = 0.08;
const THRESHOLD_MULTIPLIER = 3;

// ---------------------------------------
// START AUDIO MONITORING
// ---------------------------------------

export async function startAudioMonitoring(
  stream,
  onAudioEvent
) {
  stopAudioMonitoring();

  if (!stream) {
    throw new Error(
      "No microphone stream supplied."
    );
  }

  const audioTracks =
    stream.getAudioTracks();

  if (!audioTracks.length) {
    throw new Error(
      "No microphone track available."
    );
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "Web Audio API is not supported."
    );
  }

  audioContext =
    new AudioContextClass();

  if (
    audioContext.state === "suspended"
  ) {
    await audioContext.resume();
  }

  analyser =
    audioContext.createAnalyser();

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  microphoneSource =
    audioContext.createMediaStreamSource(
      stream
    );

  microphoneSource.connect(
    analyser
  );

  monitoring = true;
  calibrationSamples = [];
  calibrationComplete = false;
  noiseFloor = 0;
  sustainedStart = 0;
  lastTrigger = 0;

  const data =
    new Uint8Array(
      analyser.fftSize
    );

  const startTime =
    performance.now();

  function monitor() {
    if (!monitoring || !analyser) {
      return;
    }

    analyser.getByteTimeDomainData(
      data
    );

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      const normalized =
        (data[i] - 128) / 128;

      sum +=
        normalized *
        normalized;
    }

    const rms = Math.sqrt(
      sum / data.length
    );

    const now =
      performance.now();

    // -----------------------------------
    // CALIBRATION
    // -----------------------------------

    if (
      !calibrationComplete &&
      now - startTime <
        CALIBRATION_TIME
    ) {
      calibrationSamples.push(rms);
    } else if (
      !calibrationComplete
    ) {
      if (calibrationSamples.length) {
        noiseFloor =
          calibrationSamples.reduce(
            (total, value) =>
              total + value,
            0
          ) /
          calibrationSamples.length;
      }

      calibrationComplete = true;
    }

    // -----------------------------------
    // DETECTION
    // -----------------------------------

    if (calibrationComplete) {
      const threshold =
        Math.max(
          MIN_THRESHOLD,
          noiseFloor *
            THRESHOLD_MULTIPLIER
        );

      if (rms >= threshold) {
        if (!sustainedStart) {
          sustainedStart = now;
        }

        if (
          now - sustainedStart >=
            SUSTAINED_TIME &&
          now - lastTrigger >=
            COOLDOWN_TIME
        ) {
          lastTrigger = now;

          if (
            typeof onAudioEvent ===
            "function"
          ) {
            onAudioEvent({
              rms,
              threshold,
              noiseFloor,
              timestamp: now,
            });
          }

          sustainedStart = 0;
        }
      } else {
        sustainedStart = 0;
      }
    }

    animationFrame =
      requestAnimationFrame(
        monitor
      );
  }

  monitor();

  return {
    stop: stopAudioMonitoring,
  };
}

// ---------------------------------------
// STOP
// ---------------------------------------

export function stopAudioMonitoring() {
  monitoring = false;

  if (animationFrame) {
    cancelAnimationFrame(
      animationFrame
    );

    animationFrame = null;
  }

  if (microphoneSource) {
    try {
      microphoneSource.disconnect();
    } catch {
      // ignore
    }

    microphoneSource = null;
  }

  if (analyser) {
    try {
      analyser.disconnect?.();
    } catch {
      // ignore
    }

    analyser = null;
  }

  if (audioContext) {
    try {
      audioContext.close();
    } catch {
      // ignore
    }

    audioContext = null;
  }

  calibrationSamples = [];
  calibrationComplete = false;
  noiseFloor = 0;
  sustainedStart = 0;
  lastTrigger = 0;
}