import {
  FilesetResolver,
  FaceDetector,
  ObjectDetector,
} from "@mediapipe/tasks-vision";

const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const OBJECT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite";

let visionFileset = null;
let faceDetector = null;
let objectDetector = null;

let initializingPromise = null;

export async function initializeProctoring() {
  if (faceDetector && objectDetector) {
    return {
      faceDetector,
      objectDetector,
    };
  }

  if (initializingPromise) {
    return initializingPromise;
  }

  initializingPromise = (async () => {
    if (!visionFileset) {
      visionFileset =
        await FilesetResolver.forVisionTasks(
          WASM_ROOT
        );
    }

    // -------------------------------
    // FACE DETECTOR
    // -------------------------------

    if (!faceDetector) {
      const faceOptions = {
        baseOptions: {
          modelAssetPath:
            FACE_MODEL_URL,
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.55,
      };

      try {
        faceDetector =
          await FaceDetector.createFromOptions(
            visionFileset,
            {
              ...faceOptions,
              baseOptions: {
                ...faceOptions.baseOptions,
                delegate: "GPU",
              },
            }
          );
      } catch (error) {
        console.warn(
          "GPU face detector failed. Using CPU.",
          error
        );

        faceDetector =
          await FaceDetector.createFromOptions(
            visionFileset,
            faceOptions
          );
      }
    }

    // -------------------------------
    // OBJECT DETECTOR
    // -------------------------------

    if (!objectDetector) {
      const objectOptions = {
        baseOptions: {
          modelAssetPath:
            OBJECT_MODEL_URL,
        },
        runningMode: "VIDEO",
        scoreThreshold: 0.45,
        maxResults: 10,
      };

      try {
        objectDetector =
          await ObjectDetector.createFromOptions(
            visionFileset,
            {
              ...objectOptions,
              baseOptions: {
                ...objectOptions.baseOptions,
                delegate: "GPU",
              },
            }
          );
      } catch (error) {
        console.warn(
          "GPU object detector failed. Using CPU.",
          error
        );

        objectDetector =
          await ObjectDetector.createFromOptions(
            visionFileset,
            objectOptions
          );
      }
    }

    return {
      faceDetector,
      objectDetector,
    };
  })();

  try {
    return await initializingPromise;
  } finally {
    initializingPromise = null;
  }
}

// ---------------------------------------
// FACE DETECTION
// ---------------------------------------

export function detectFaces(video) {
  if (
    !faceDetector ||
    !video ||
    video.readyState < 2
  ) {
    return [];
  }

  try {
    const result =
      faceDetector.detectForVideo(
        video,
        performance.now()
      );

    return result?.detections || [];
  } catch (error) {
    console.error(
      "Face detection error:",
      error
    );

    return [];
  }
}

// ---------------------------------------
// OBJECT DETECTION
// ---------------------------------------

export function detectObjects(video) {
  if (
    !objectDetector ||
    !video ||
    video.readyState < 2
  ) {
    return [];
  }

  try {
    const result =
      objectDetector.detectForVideo(
        video,
        performance.now()
      );

    return result?.detections || [];
  } catch (error) {
    console.error(
      "Object detection error:",
      error
    );

    return [];
  }
}

// ---------------------------------------
// OBJECT NAMES
// ---------------------------------------

export function getObjectNames(
  detections = []
) {
  return detections.flatMap(
    (detection) =>
      (detection.categories || []).map(
        (category) =>
          category.categoryName ||
          category.displayName ||
          ""
      )
  );
}

// ---------------------------------------
// CLEANUP
// ---------------------------------------

export function closeProctoring() {
  try {
    if (faceDetector) {
      faceDetector.close();
      faceDetector = null;
    }
  } catch (error) {
    console.warn(
      "Could not close face detector:",
      error
    );
  }

  try {
    if (objectDetector) {
      objectDetector.close();
      objectDetector = null;
    }
  } catch (error) {
    console.warn(
      "Could not close object detector:",
      error
    );
  }

  visionFileset = null;
  initializingPromise = null;
}