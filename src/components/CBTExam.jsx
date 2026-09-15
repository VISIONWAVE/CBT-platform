import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock3,
  Send,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Maximize,
  Monitor,
  Wifi,
  Camera,
  UserRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { questions } from "../data/questions";

function CBTExam({
  subject = "Use of English",
  onFinish,
  onCancel,
}) {
  // =====================================================
  // QUESTIONS
  // =====================================================

  const examQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.subject === subject
      ),
    [subject]
  );

  // =====================================================
  // EXAM STATE
  // =====================================================

  const [examStarted, setExamStarted] =
    useState(false);

  const [current, setCurrent] =
    useState(0);

  const [answers, setAnswers] =
    useState({});

  const [flagged, setFlagged] =
    useState([]);

  const [seconds, setSeconds] =
    useState(30 * 60);

  const [showSubmit, setShowSubmit] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  // =====================================================
  // PRE-EXAM CHECK STATE
  // =====================================================

  const [fullscreenSupported, setFullscreenSupported] =
    useState(false);

  const [internetConnected, setInternetConnected] =
    useState(navigator.onLine);

  const [cameraStatus, setCameraStatus] =
    useState("checking");

  const [cameraReady, setCameraReady] =
    useState(false);

  const [faceReady, setFaceReady] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const videoRef = useRef(null);

  const streamRef = useRef(null);

  // =====================================================
  // ANTI-CHEATING
  // =====================================================

  const [violations, setViolations] =
    useState(0);

  const [showViolation, setShowViolation] =
    useState(false);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  // =====================================================
  // REFS
  // =====================================================

  const answersRef =
    useRef(answers);

  const submittedRef =
    useRef(submitted);

  const onFinishRef =
    useRef(onFinish);

  const violationLockRef =
    useRef(false);

  const fullscreenViolationLockRef =
    useRef(false);

  // =====================================================
  // KEEP REFS UPDATED
  // =====================================================

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // =====================================================
  // FULLSCREEN CAPABILITY CHECK
  // =====================================================

  useEffect(() => {
    const supported =
      Boolean(document.fullscreenEnabled) &&
      typeof document.documentElement
        .requestFullscreen === "function";

    setFullscreenSupported(supported);
  }, []);

  // =====================================================
  // INTERNET CHECK
  // =====================================================

  useEffect(() => {
    function handleOnline() {
      setInternetConnected(true);
    }

    function handleOffline() {
      setInternetConnected(false);
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  // =====================================================
  // CAMERA
  // =====================================================

  async function startCamera() {
    setCameraStatus("checking");
    setCameraError("");
    setCameraReady(false);
    setFaceReady(false);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraStatus("failed");

        setCameraError(
          "Your browser does not support camera access."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play().catch(
          () => {}
        );
      }

      setCameraStatus("passed");

      setCameraReady(true);

      /*
       * The camera is active and the candidate
       * can position their face.
       *
       * Actual AI face detection will be added
       * later.
       */
      setFaceReady(true);
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      setCameraStatus("failed");

      setCameraReady(false);

      setFaceReady(false);

      if (
        error.name ===
        "NotAllowedError"
      ) {
        setCameraError(
          "Camera permission was denied. Please allow camera access."
        );
      } else if (
        error.name ===
        "NotFoundError"
      ) {
        setCameraError(
          "No camera was found on this device."
        );
      } else {
        setCameraError(
          "Unable to access the camera. Please check your camera."
        );
      }
    }
  }

  // =====================================================
  // STOP CAMERA
  // =====================================================

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }
  }

  // =====================================================
  // START CAMERA WHEN PRE-CHECK OPENS
  // =====================================================

  useEffect(() => {
    if (
      examQuestions.length === 0 ||
      examStarted
    ) {
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [
    examQuestions.length,
    examStarted,
  ]);

  // =====================================================
  // ENTER FULLSCREEN
  // =====================================================

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.log(
        "Fullscreen request blocked:",
        error
      );
    }
  }

  // =====================================================
  // EXIT FULLSCREEN
  // =====================================================

  function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          .catch(() => {});
      }
    } catch (error) {
      console.log(
        "Could not exit fullscreen:",
        error
      );
    }
  }

  // =====================================================
  // BEGIN EXAM
  // =====================================================

  async function beginExam() {
    if (!allChecksPassed) {
      return;
    }

    stopCamera();

    await enterFullscreen();

    setExamStarted(true);
  }

  // =====================================================
  // ALL CHECKS
  // =====================================================

  const allChecksPassed =
    fullscreenSupported &&
    internetConnected &&
    cameraReady &&
    faceReady;

  // =====================================================
  // FINISH EXAM
  // =====================================================

  function finishExam() {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    setSubmitted(true);

    setShowSubmit(false);

    setShowViolation(false);

    stopCamera();

    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .catch(() => {});
    }

    if (
      typeof onFinishRef.current ===
      "function"
    ) {
      onFinishRef.current(
        answersRef.current,
        examQuestions
      );
    }
  }

  // =====================================================
  // REGISTER VIOLATION
  // =====================================================

  function registerViolation() {
    if (
      submittedRef.current ||
      examQuestions.length === 0 ||
      !examStarted
    ) {
      return;
    }

    if (violationLockRef.current) {
      return;
    }

    violationLockRef.current = true;

    setViolations((previous) => {
      const newCount =
        previous + 1;

      if (newCount >= 3) {
        setTimeout(() => {
          finishExam();
        }, 300);

        return newCount;
      }

      setShowViolation(true);

      return newCount;
    });

    setTimeout(() => {
      violationLockRef.current = false;
    }, 1000);
  }

  // =====================================================
  // TAB SWITCH DETECTION
  // =====================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleVisibilityChange() {
      if (
        document.hidden &&
        !submittedRef.current
      ) {
        registerViolation();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    examStarted,
    examQuestions.length,
  ]);

  // =====================================================
  // WINDOW BLUR
  // =====================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleWindowBlur() {
      if (!submittedRef.current) {
        registerViolation();
      }
    }

    window.addEventListener(
      "blur",
      handleWindowBlur
    );

    return () => {
      window.removeEventListener(
        "blur",
        handleWindowBlur
      );
    };
  }, [
    examStarted,
    examQuestions.length,
  ]);

  // =====================================================
  // FULLSCREEN DETECTION
  // =====================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleFullscreenChange() {
      const active =
        Boolean(
          document.fullscreenElement
        );

      setIsFullscreen(active);

      if (
        !active &&
        !submittedRef.current
      ) {
        if (
          fullscreenViolationLockRef.current
        ) {
          return;
        }

        fullscreenViolationLockRef.current =
          true;

        registerViolation();

        setTimeout(() => {
          fullscreenViolationLockRef.current =
            false;
        }, 1000);
      }
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, [
    examStarted,
    examQuestions.length,
  ]);

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    if (
      !examStarted ||
      submitted
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setSeconds((previous) => {
          if (previous <= 1) {
            clearInterval(timer);

            finishExam();

            return 0;
          }

          return previous - 1;
        });
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    examStarted,
    submitted,
  ]);

  // =====================================================
  // NO QUESTIONS
  // =====================================================

  if (examQuestions.length === 0) {
    return (
      <div className="cbt-page">

        <header className="cbt-header">

          <div>
            <div className="cbt-logo">
              C
            </div>

            <div>
              <strong>
                CBT Arena
              </strong>

              <span>
                {subject} Examination
              </span>
            </div>
          </div>

        </header>

        <div
          style={{
            minHeight:
              "calc(100vh - 80px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#fff",
              borderRadius: "20px",
              padding: "45px 30px",
              textAlign: "center",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <AlertCircle
              size={45}
            />

            <h1>
              No Questions Available
            </h1>

            <p>
              There are currently no
              questions available for{" "}
              <strong>{subject}</strong>.
            </p>

            <button
              className="hero-primary"
              onClick={() => {
                if (
                  typeof onCancel ===
                  "function"
                ) {
                  onCancel();
                }
              }}
            >
              Back to Dashboard
            </button>

          </div>
        </div>

      </div>
    );
  }

  // =====================================================
  // PRE-EXAMINATION SYSTEM CHECK
  // =====================================================

  if (!examStarted) {
    return (
      <div className="precheck-page">

        <div className="precheck-glow glow-one"></div>
        <div className="precheck-glow glow-two"></div>

        {/* HEADER */}

        <header className="precheck-header">

          <div className="precheck-brand">

            <div className="precheck-logo">
              C
            </div>

            <div>
              <strong>
                CBT Arena
              </strong>

              <span>
                Examination Portal
              </span>
            </div>

          </div>

          <div className="precheck-secure">

            <ShieldCheck size={17} />

            Secure Examination

          </div>

        </header>

        {/* CONTENT */}

        <main className="precheck-container">

          <div className="precheck-heading">

            <div className="precheck-badge">

              <ShieldCheck size={15} />

              PRE-EXAMINATION SYSTEM CHECK

            </div>

            <h1>
              Let's check your{" "}
              <span>
                examination setup.
              </span>
            </h1>

            <p>
              The examination is conducted
              in a{" "}
              <strong>
                proctored environment.
              </strong>{" "}
              Before the examination begins,
              a few system checks will be
              performed to verify that your
              device, browser and internet
              connection meet the required
              examination standards.
            </p>

            <div className="exam-subject-label">

              Examination:

              <strong>
                {subject}
              </strong>

            </div>

          </div>

          {/* GRID */}

          <div className="precheck-grid">

            {/* SYSTEM CHECKS */}

            <section className="system-check-card">

              <div className="card-title">

                <div>

                  <span>
                    SYSTEM READINESS CHECKS
                  </span>

                  <h2>
                    Device verification
                  </h2>

                </div>

                <ShieldCheck
                  size={27}
                />

              </div>

              {/* FULLSCREEN */}

              <div className="check-item">

                <div className="check-icon purple">
                  <Monitor size={22} />
                </div>

                <div className="check-content">

                  <h3>
                    Fullscreen Capability
                  </h3>

                  <p>
                    The browser must support
                    fullscreen mode to provide
                    a secure examination
                    environment.
                  </p>

                </div>

                <StatusIcon
                  passed={
                    fullscreenSupported
                  }
                />

              </div>

              {/* INTERNET */}

              <div className="check-item">

                <div className="check-icon blue">
                  <Wifi size={22} />
                </div>

                <div className="check-content">

                  <h3>
                    Internet Connection
                  </h3>

                  <p>
                    A stable internet connection
                    is required throughout the
                    examination.
                  </p>

                </div>

                <StatusIcon
                  passed={
                    internetConnected
                  }
                />

              </div>

              {/* CAMERA */}

              <div className="check-item">

                <div className="check-icon green">
                  <Camera size={22} />
                </div>

                <div className="check-content">

                  <h3>
                    Camera
                  </h3>

                  <p>
                    Camera access is required
                    to verify the candidate's
                    presence.
                  </p>

                  {cameraError && (
                    <small className="camera-error">
                      {cameraError}
                    </small>
                  )}

                </div>

                <StatusIcon
                  passed={
                    cameraReady
                  }
                  checking={
                    cameraStatus ===
                    "checking"
                  }
                />

              </div>

              {/* FACE */}

              <div className="check-item">

                <div className="check-icon orange">
                  <UserRound size={22} />
                </div>

                <div className="check-content">

                  <h3>
                    Face Visibility
                  </h3>

                  <p>
                    Ensure that your face
                    remains clearly visible
                    and positioned inside
                    the camera frame.
                  </p>

                </div>

                <StatusIcon
                  passed={
                    faceReady
                  }
                />

              </div>

              {/* READINESS */}

              <div
                className={`readiness-box ${
                  allChecksPassed
                    ? "ready"
                    : "not-ready"
                }`}
              >

                {allChecksPassed ? (
                  <>
                    <CheckCircle2
                      size={22}
                    />

                    <div>

                      <strong>
                        Examination
                        Readiness Confirmed
                      </strong>

                      <span>
                        All required system
                        checks have been
                        successfully completed.
                      </span>

                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle
                      size={22}
                    />

                    <div>

                      <strong>
                        Complete all checks
                      </strong>

                      <span>
                        Please resolve the
                        failed checks before
                        proceeding.
                      </span>

                    </div>
                  </>
                )}

              </div>

              {/* RETRY */}

              {cameraStatus ===
                "failed" && (
                <button
                  className="retry-camera"
                  onClick={startCamera}
                >
                  <RefreshCw
                    size={16}
                  />

                  Retry Camera

                </button>
              )}

            </section>

            {/* CAMERA */}

            <section className="camera-card">

              <div className="camera-card-header">

                <div>

                  <span>
                    CAMERA VERIFICATION
                  </span>

                  <h2>
                    Position yourself
                  </h2>

                </div>

                {cameraReady && (
                  <div className="live-badge">

                    <span></span>

                    LIVE

                  </div>
                )}

              </div>

              <div className="camera-preview">

                {cameraReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="camera-video"
                  />
                ) : (
                  <div className="camera-placeholder">

                    <Camera size={50} />

                    <strong>
                      Camera Preview
                    </strong>

                    <span>
                      Camera access is
                      required before
                      starting the exam.
                    </span>

                  </div>
                )}

                {cameraReady && (
                  <div className="camera-frame">

                    <div className="corner top-left"></div>

                    <div className="corner top-right"></div>

                    <div className="corner bottom-left"></div>

                    <div className="corner bottom-right"></div>

                    <div className="face-guide">

                      <UserRound
                        size={72}
                      />

                    </div>

                  </div>
                )}

              </div>

              <div className="camera-instruction">

                <CheckCircle2
                  size={18}
                />

                <span>
                  Position your face inside
                  the frame and ensure there
                  is enough lighting.
                </span>

              </div>

            </section>

          </div>

          {/* CONFIRMATION */}

          <div
            className={`final-readiness ${
              allChecksPassed
                ? "ready"
                : ""
            }`}
          >

            <div className="final-icon">

              <ShieldCheck
                size={27}
              />

            </div>

            <div>

              <h2>
                {allChecksPassed
                  ? "Examination Readiness Confirmed"
                  : "Examination Not Ready"}
              </h2>

              <p>
                {allChecksPassed
                  ? "All required system checks have been successfully completed. The examination may now begin."
                  : "Please complete the required system checks before starting your examination."}
              </p>

            </div>

          </div>

          {/* BUTTONS */}

          <div className="precheck-actions">

            <button
              className="back-dashboard"
              onClick={() => {
                stopCamera();

                if (
                  typeof onCancel ===
                  "function"
                ) {
                  onCancel();
                }
              }}
            >
              Back to Dashboard
            </button>

            <button
              className="start-exam-button"
              disabled={!allChecksPassed}
              onClick={beginExam}
            >
              Start Examination

              <ArrowRightIcon />

            </button>

          </div>

          <div className="precheck-footer">

            <ShieldCheck size={14} />

            Your examination environment
            is monitored to maintain
            examination integrity.

          </div>

        </main>

      </div>
    );
  }

  // =====================================================
  // EXAM VARIABLES
  // =====================================================

  const question =
    examQuestions[current];

  const minutes = Math.floor(
    seconds / 60
  )
    .toString()
    .padStart(2, "0");

  const secs = (
    seconds % 60
  )
    .toString()
    .padStart(2, "0");

  // =====================================================
  // ANSWER
  // =====================================================

  function selectAnswer(index) {
    if (submittedRef.current) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [question.id]: index,
    }));
  }

  // =====================================================
  // FLAG
  // =====================================================

  function toggleFlag() {
    if (submittedRef.current) {
      return;
    }

    setFlagged((previous) =>
      previous.includes(question.id)
        ? previous.filter(
            (id) =>
              id !== question.id
          )
        : [
            ...previous,
            question.id,
          ]
    );
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  function nextQuestion() {
    setCurrent((previous) =>
      Math.min(
        examQuestions.length - 1,
        previous + 1
      )
    );
  }

  function previousQuestion() {
    setCurrent((previous) =>
      Math.max(0, previous - 1)
    );
  }

  // =====================================================
  // COUNTS
  // =====================================================

  const answeredCount =
    Object.keys(answers).length;

  const remainingCount =
    examQuestions.length -
    answeredCount;

  // =====================================================
  // EXAM SCREEN
  // =====================================================

  return (
    <div className="cbt-page">

      {/* HEADER */}

      <header className="cbt-header">

        <div>

          <div className="cbt-logo">
            C
          </div>

          <div>

            <strong>
              CBT Arena
            </strong>

            <span>
              {subject} Examination
            </span>

          </div>

        </div>

        <div className="exam-progress">

          Question{" "}

          <strong>
            {current + 1}
          </strong>{" "}

          of{" "}

          <strong>
            {examQuestions.length}
          </strong>

        </div>

        <div
          className={`timer ${
            seconds < 300
              ? "danger"
              : ""
          }`}
        >

          <Clock3 size={18} />

          {minutes}:{secs}

        </div>

      </header>

      {/* BODY */}

      <div className="cbt-body">

        {/* QUESTION */}

        <main className="question-area">

          <div className="question-top">

            <span>
              QUESTION{" "}
              {current + 1}
            </span>

            <button
              className={`flag-button ${
                flagged.includes(
                  question.id
                )
                  ? "flagged"
                  : ""
              }`}
              onClick={
                toggleFlag
              }
            >

              <Flag size={16} />

              {flagged.includes(
                question.id
              )
                ? "Flagged"
                : "Flag Question"}

            </button>

          </div>

          <div className="question-card">

            <h1>
              {question.question}
            </h1>

            <div className="options">

              {question.options.map(
                (
                  option,
                  index
                ) => (
                  <button
                    key={`${question.id}-${index}`}
                    className={`option ${
                      answers[
                        question.id
                      ] === index
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectAnswer(
                        index
                      )
                    }
                  >

                    <span className="option-letter">

                      {String.fromCharCode(
                        65 + index
                      )}

                    </span>

                    <span>
                      {option}
                    </span>

                  </button>
                )
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="question-actions">

            <button
              className="previous-button"
              disabled={
                current === 0
              }
              onClick={
                previousQuestion
              }
            >

              <ChevronLeft
                size={18}
              />

              Previous

            </button>

            {current <
            examQuestions.length -
              1 ? (
              <button
                className="next-button"
                onClick={
                  nextQuestion
                }
              >

                Next

                <ChevronRight
                  size={18}
                />

              </button>
            ) : (
              <button
                className="submit-button"
                onClick={() =>
                  setShowSubmit(
                    true
                  )
                }
              >

                <Send size={17} />

                Submit Exam

              </button>
            )}

          </div>

        </main>

        {/* NAVIGATOR */}

        <aside className="navigator">

          <div className="navigator-heading">

            <div>

              <span>
                QUESTIONS
              </span>

              <h2>
                Navigator
              </h2>

            </div>

          </div>

          <div className="navigator-legend">

            <span>

              <i className="answered-dot"></i>

              Answered

            </span>

            <span>

              <i className="flag-dot"></i>

              Flagged

            </span>

          </div>

          <div className="question-grid">

            {examQuestions.map(
              (
                item,
                index
              ) => {

                const answered =
                  answers[
                    item.id
                  ] !== undefined;

                const isFlagged =
                  flagged.includes(
                    item.id
                  );

                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      setCurrent(
                        index
                      )
                    }
                    className={`navigator-number
                      ${
                        current ===
                        index
                          ? "active"
                          : ""
                      }
                      ${
                        answered
                          ? "answered"
                          : ""
                      }
                      ${
                        isFlagged
                          ? "flagged"
                          : ""
                      }
                    `}
                  >

                    {index + 1}

                  </button>
                );
              }
            )}

          </div>

          {/* SUMMARY */}

          <div className="navigator-summary">

            <div>

              <span>
                Answered
              </span>

              <strong>
                {answeredCount}
              </strong>

            </div>

            <div>

              <span>
                Remaining
              </span>

              <strong>
                {remainingCount}
              </strong>

            </div>

            <div>

              <span>
                Flagged
              </span>

              <strong>
                {flagged.length}
              </strong>

            </div>

          </div>

          {/* VIOLATIONS */}

          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              borderRadius: "12px",
              background:
                violations === 0
                  ? "#f2f4f7"
                  : "#fff3cd",
              border:
                "1px solid #eaecf0",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >

              <ShieldAlert
                size={17}
              />

              Exam Violations

            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "13px",
                color: "#667085",
              }}
            >

              {violations} of 3

            </div>

          </div>

          <button
            className="navigator-submit"
            onClick={() =>
              setShowSubmit(true)
            }
          >

            Submit Examination

          </button>

        </aside>

      </div>

      {/* FULLSCREEN REMINDER */}

      {!isFullscreen &&
        !showViolation &&
        !submitted && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform:
                "translateX(-50%)",
              zIndex: 1000,
              background: "#101828",
              color: "#fff",
              padding:
                "12px 18px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.25)",
              fontSize: "13px",
            }}
          >

            <Maximize size={17} />

            Fullscreen mode is
            required for this
            examination.

          </div>
        )}

      {/* VIOLATION MODAL */}

      {showViolation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(10, 15, 25, 0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "25px",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#fff",
              borderRadius: "22px",
              padding:
                "40px 30px",
              textAlign: "center",
              boxShadow:
                "0 25px 80px rgba(0,0,0,0.4)",
            }}
          >

            <div
              style={{
                width: "80px",
                height: "80px",
                margin:
                  "0 auto 20px",
                borderRadius: "50%",
                background:
                  "#fff3cd",
                color: "#856404",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >

              <ShieldAlert
                size={42}
              />

            </div>

            <span
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing:
                  "0.08em",
                color: "#d92d20",
                marginBottom:
                  "8px",
              }}
            >
              EXAMINATION WARNING
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              You left the
              examination window
            </h2>

            <p
              style={{
                marginTop: "15px",
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              Switching browser tabs,
              windows, or leaving
              fullscreen mode is
              recorded as an
              examination violation.
            </p>

            <div
              style={{
                margin: "20px 0",
                padding: "15px",
                borderRadius: "12px",
                background:
                  "#fef3f2",
                color: "#b42318",
                fontWeight: 700,
              }}
            >

              Violation{" "}
              {violations} of 3

            </div>

            <p
              style={{
                fontSize: "13px",
                color: "#667085",
              }}
            >
              Your third violation
              will automatically
              submit the examination.
            </p>

            <button
              className="hero-primary"
              onClick={async () => {
                setShowViolation(
                  false
                );

                await enterFullscreen();
              }}
              style={{
                margin:
                  "20px auto 0",
              }}
            >

              <Maximize
                size={18}
              />

              Return to Examination

            </button>

          </div>

        </div>
      )}

      {/* SUBMIT MODAL */}

      {showSubmit && (
        <div className="modal-backdrop">

          <div className="submit-modal">

            <h2>
              Submit examination?
            </h2>

            <p>
              You have answered{" "}
              <strong>
                {answeredCount}
              </strong>{" "}
              out of{" "}
              <strong>
                {examQuestions.length}
              </strong>{" "}
              questions.
            </p>

            {answeredCount <
              examQuestions.length && (
              <div className="warning">

                You still have{" "}
                <strong>
                  {remainingCount}
                </strong>{" "}
                unanswered questions.

              </div>
            )}

            <div className="modal-actions">

              <button
                onClick={() =>
                  setShowSubmit(
                    false
                  )
                }
                className="cancel-button"
              >
                Continue Exam
              </button>

              <button
                onClick={
                  finishExam
                }
                className="confirm-submit"
              >
                Submit Now
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// =======================================================
// STATUS COMPONENT
// =======================================================

function StatusIcon({
  passed,
  checking = false,
}) {
  if (checking) {
    return (
      <div className="system-status checking">
        <RefreshCw
          size={18}
          className="spin-icon"
        />
      </div>
    );
  }

  if (passed) {
    return (
      <div className="system-status passed">
        <CheckCircle2
          size={20}
        />
      </div>
    );
  }

  return (
    <div className="system-status failed">
      <XCircle size={20} />
    </div>
  );
}

// =======================================================
// ARROW ICON
// =======================================================

function ArrowRightIcon() {
  return (
    <ChevronRight size={19} />
  );
}

export default CBTExam;