import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function shuffleArray(items) {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function normalizeAnswer(value) {
  if (value === null || value === undefined) {
    return -1;
  }

  if (typeof value === "number") {
    return value >= 0 && value <= 4 ? value : -1;
  }

  const answer = String(value).trim().toUpperCase();

  const map = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
  };

  return map[answer] ?? -1;
}

function normalizeQuestion(row) {
  const options = [
    row.option_a,
    row.option_b,
    row.option_c,
    row.option_d,
    row.option_e,
  ].filter(
    (option) =>
      option !== null &&
      option !== undefined &&
      String(option).trim() !== ""
  );

  return {
    id: row.id,
    question: row.question_text || "",
    options,
    answer: normalizeAnswer(row.correct_option),

    subjectId: row.subject_id,
    departmentId: row.department_id,

    year: row.year,
    examSeries: row.exam_series,
    paper: row.paper,
    questionNumber: row.question_number,

    topic: row.topic,
    subtopic: row.subtopic,
    difficulty: row.difficulty,

    explanation: row.explanation,

    sourceType: row.source_type,
    sourceReference: row.source_reference,
    sourceUrl: row.source_url,
  };
}

function CBTExam({
  subject = "Use of English",
  onFinish,
  onCancel,

  questionCount: initialQuestionCount = 150,
  durationMinutes: initialDurationMinutes = 180,

  mode = "full_mock",
  year = null,
  startYear = null,
  endYear = null,
}) {
  // =========================================================
  // CONFIGURATION
  // =========================================================

  const [questionCount, setQuestionCount] = useState(
    initialQuestionCount
  );

  const [durationMinutes, setDurationMinutes] = useState(
    initialDurationMinutes
  );

  // =========================================================
  // DATABASE STATE
  // =========================================================

  const [loading, setLoading] = useState(true);

  const [loadingMessage, setLoadingMessage] =
    useState("Loading examination questions...");

  const [loadError, setLoadError] = useState("");

  const [availableQuestionCount, setAvailableQuestionCount] =
    useState(0);

  const [examQuestions, setExamQuestions] = useState([]);

  // =========================================================
  // EXAM STATE
  // =========================================================

  const [examStarted, setExamStarted] = useState(false);

  const [current, setCurrent] = useState(0);

  const [answers, setAnswers] = useState({});

  const [flagged, setFlagged] = useState([]);

  const [seconds, setSeconds] = useState(
    initialDurationMinutes * 60
  );

  const [showSubmit, setShowSubmit] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  // =========================================================
  // EXAM INFORMATION
  // =========================================================

  const [subjectInfo, setSubjectInfo] = useState(null);

  // =========================================================
  // INTERNET
  // =========================================================

  const [internetConnected, setInternetConnected] =
    useState(() =>
      typeof navigator !== "undefined"
        ? navigator.onLine
        : true
    );

  // =========================================================
  // ANTI-CHEATING / EXAM INTEGRITY
  // =========================================================

  const [violations, setViolations] = useState(0);

  const [showViolation, setShowViolation] =
    useState(false);

  const [violationReason, setViolationReason] =
    useState("");

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  // =========================================================
  // REFS
  // =========================================================

  const answersRef = useRef(answers);

  const submittedRef = useRef(submitted);

  const onFinishRef = useRef(onFinish);

  const violationLockRef = useRef(false);

  const fullscreenViolationLockRef =
    useRef(false);

  const finishLockRef = useRef(false);

  // =========================================================
  // KEEP REFS UPDATED
  // =========================================================

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // =========================================================
  // LOAD QUESTIONS FROM SUPABASE
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setLoading(true);
      setLoadError("");

      try {
        setLoadingMessage(
          `Finding ${subject} in the CBT Arena database...`
        );

        // -----------------------------------------------------
        // FIND SUBJECT
        // -----------------------------------------------------

        const databaseSubjectName =
  subject === "Use of English"
    ? "English Language"
    : subject;

const { data: subjectRow, error: subjectError } =
  await supabase
    .from("subjects")
    .select("*")
    .eq("name", databaseSubjectName)
    .maybeSingle();

        if (subjectError) {
          throw new Error(
            `Unable to load subject: ${subjectError.message}`
          );
        }

        if (!subjectRow) {
          throw new Error(
            `The subject "${subject}" was not found in the database.`
          );
        }

        if (cancelled) {
          return;
        }

        setSubjectInfo(subjectRow);

        // -----------------------------------------------------
        // FIND QUESTIONS
        // -----------------------------------------------------

        setLoadingMessage(
          `Loading ${subject} questions from the database...`
        );

        let query = supabase
          .from("questions")
          .select("*")
          .eq("subject_id", subjectRow.id)
          .eq("is_active", true);
          

        // -----------------------------------------------------
        // YEAR FILTER
        // -----------------------------------------------------

        if (year) {
          query = query.eq("year", year);
        }

        // -----------------------------------------------------
        // YEAR RANGE FILTER
        // -----------------------------------------------------

        if (startYear) {
          query = query.gte("year", startYear);
        }

        if (endYear) {
          query = query.lte("year", endYear);
        }

        const { data: rows, error: questionsError } =
          await query;

        if (questionsError) {
          throw new Error(
            `Unable to load questions: ${questionsError.message}`
          );
        }

        if (cancelled) {
          return;
        }

        const normalizedQuestions = (rows || [])
          .map(normalizeQuestion)
          .filter(
            (question) =>
              question.question &&
              question.options.length >= 2
          );

        setAvailableQuestionCount(
          normalizedQuestions.length
        );

        // -----------------------------------------------------
        // RANDOMIZE
        // -----------------------------------------------------

        const randomized =
          shuffleArray(normalizedQuestions);

        const selected = randomized.slice(
          0,
          Math.min(
            Number(questionCount) || 150,
            randomized.length
          )
        );

        setExamQuestions(selected);

        // Reset examination state when a new subject is loaded.
        setCurrent(0);
        setAnswers({});
        setFlagged([]);
        setSubmitted(false);
        setExamStarted(false);
        setSeconds(
          (Number(durationMinutes) || 180) * 60
        );
      } catch (error) {
        console.error(
          "CBT Arena question loading error:",
          error
        );

        if (!cancelled) {
          setLoadError(
            error?.message ||
              "Something went wrong while loading the examination."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [
    subject,
    year,
    startYear,
    endYear,
    questionCount,
    durationMinutes,
  ]);

  // =========================================================
  // INTERNET MONITORING
  // =========================================================

  useEffect(() => {
    function handleOnline() {
      setInternetConnected(true);
    }

    function handleOffline() {
      setInternetConnected(false);
    }

    window.addEventListener("online", handleOnline);

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

  // =========================================================
  // FULLSCREEN SUPPORT
  // =========================================================

  const fullscreenSupported = useMemo(() => {
    return (
      typeof document !== "undefined" &&
      Boolean(document.fullscreenEnabled) &&
      typeof document.documentElement
        .requestFullscreen === "function"
    );
  }, []);

  // =========================================================
  // ENTER FULLSCREEN
  // =========================================================

  async function enterFullscreen() {
    if (!fullscreenSupported) {
      return false;
    }

    try {
      await document.documentElement.requestFullscreen();

      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );

      return true;
    } catch (error) {
      console.warn(
        "Fullscreen could not be enabled:",
        error
      );

      return false;
    }
  }

  // =========================================================
  // EXIT FULLSCREEN
  // =========================================================

  async function exitFullscreen() {
    if (
      typeof document !== "undefined" &&
      document.fullscreenElement
    ) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn(
          "Fullscreen could not be exited:",
          error
        );
      }
    }

    setIsFullscreen(false);
  }

  // =========================================================
  // VIOLATION
  // =========================================================

  function registerViolation(reason) {
    if (submittedRef.current) {
      return;
    }

    if (violationLockRef.current) {
      return;
    }

    violationLockRef.current = true;

    setViolationReason(reason);

    setViolations((previous) => {
      const next = previous + 1;

      return next;
    });

    setShowViolation(true);

    setTimeout(() => {
      violationLockRef.current = false;
    }, 1500);
  }

  // =========================================================
  // FULLSCREEN MONITOR
  // =========================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleFullscreenChange() {
      const active =
        Boolean(document.fullscreenElement);

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

        registerViolation(
          "You left fullscreen mode during the examination."
        );

        setTimeout(() => {
          fullscreenViolationLockRef.current =
            false;
        }, 1500);
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
  }, [examStarted]);

  // =========================================================
  // WINDOW FOCUS MONITOR
  // =========================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleBlur() {
      registerViolation(
        "The examination window lost focus."
      );
    }

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener(
        "blur",
        handleBlur
      );
    };
  }, [examStarted]);

  // =========================================================
  // TAB VISIBILITY
  // =========================================================

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    function handleVisibilityChange() {
      if (
        document.hidden &&
        !submittedRef.current
      ) {
        registerViolation(
          "The examination tab was moved out of view."
        );
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
  }, [examStarted]);

  // =========================================================
  // START EXAM
  // =========================================================
async function beginExam() {
  if (examQuestions.length === 0) {
    return;
  }

  if (!internetConnected) {
    setViolationReason(
      "An internet connection is required to begin the examination."
    );

    setShowViolation(true);
    return;
  }

  if (fullscreenSupported) {
    await enterFullscreen();
  }

  setSeconds(
    (Number(durationMinutes) || 180) * 60
  );

  setCurrent(0);
  setAnswers({});
  setFlagged([]);
  setSubmitted(false);
  setExamStarted(true);
}
  async function beginExam() {
    if (examQuestions.length === 0) {
      return;
    }

    if (!internetConnected) {
      setViolationReason(
        "An internet connection is required to begin the examination."
      );

      setShowViolation(true);

      return;
    }

    if (fullscreenSupported) {
      await enterFullscreen();
    }

    setSeconds(
      (Number(durationMinutes) || 180) * 60
    );

    setCurrent(0);

    setAnswers({});

    setFlagged([]);

    setSubmitted(false);

    setExamStarted(true);
  }

  // =========================================================
  // FINISH EXAM
  // =========================================================

  async function finishExam() {
    if (finishLockRef.current) {
      return;
    }

    finishLockRef.current = true;

    if (submittedRef.current) {
      return;
    }

    setSubmitted(true);

    setShowSubmit(false);

    await exitFullscreen();

    const finalAnswers =
      answersRef.current;

    const finalQuestions =
      examQuestions;

    if (
      typeof onFinishRef.current ===
      "function"
    ) {
      onFinishRef.current(
        finalAnswers,
        finalQuestions
      );
    }
  }

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (
      !examStarted ||
      submitted ||
      examQuestions.length === 0
    ) {
      return;
    }

    const timer = setInterval(() => {
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
    examQuestions.length,
  ]);

  // =========================================================
  // ANSWER
  // =========================================================

  function selectAnswer(index) {
    if (submittedRef.current) {
      return;
    }

    const question =
      examQuestions[current];

    if (!question) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [question.id]: index,
    }));
  }

  // =========================================================
  // FLAG
  // =========================================================

  function toggleFlag() {
    if (submittedRef.current) {
      return;
    }

    const question =
      examQuestions[current];

    if (!question) {
      return;
    }

    setFlagged((previous) =>
      previous.includes(question.id)
        ? previous.filter(
            (id) => id !== question.id
          )
        : [
            ...previous,
            question.id,
          ]
    );
  }

  // =========================================================
  // NEXT
  // =========================================================

  function nextQuestion() {
    setCurrent((previous) =>
      Math.min(
        examQuestions.length - 1,
        previous + 1
      )
    );
  }

  // =========================================================
  // PREVIOUS
  // =========================================================

  function previousQuestion() {
    setCurrent((previous) =>
      Math.max(0, previous - 1)
    );
  }

  // =========================================================
  // QUESTION NAVIGATION
  // =========================================================

  function goToQuestion(index) {
    setCurrent(
      Math.max(
        0,
        Math.min(
          examQuestions.length - 1,
          index
        )
      )
    );
  }

  // =========================================================
  // COUNTS
  // =========================================================

  const answeredCount =
    Object.keys(answers).length;

  const flaggedCount =
    flagged.length;

  const unansweredCount =
    Math.max(
      0,
      examQuestions.length -
        answeredCount
    );

  // =========================================================
  // TIMER DISPLAY
  // =========================================================

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

  // =========================================================
  // CURRENT QUESTION
  // =========================================================

  const question =
    examQuestions[current];

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
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
                Examination System
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
            <RefreshCw
              size={45}
              style={{
                animation:
                  "spin 1.2s linear infinite",
              }}
            />

            <h1>
              Loading Examination
            </h1>

            <p
              style={{
                marginTop: "12px",
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              {loadingMessage}
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "10px",
                fontSize: "14px",
              }}
            >
              Subject:{" "}
              <strong>{subject}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR SCREEN
  // =========================================================

  if (loadError) {
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
                Examination System
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
              maxWidth: "560px",
              background: "#fff",
              borderRadius: "20px",
              padding: "45px 30px",
              textAlign: "center",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <AlertCircle
              size={55}
              style={{
                marginBottom: "15px",
              }}
            />

            <h1>
              Unable to Load Examination
            </h1>

            <p
              style={{
                marginTop: "12px",
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              {loadError}
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginTop: "25px",
                flexWrap: "wrap",
              }}
            >
              <button
                className="hero-primary"
                onClick={() =>
                  window.location.reload()
                }
              >
                <RefreshCw size={17} />
                Retry
              </button>

              <button
                className="hero-secondary"
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
      </div>
    );
  }

  // =========================================================
  // NO QUESTIONS
  // =========================================================

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
              maxWidth: "560px",
              background: "#fff",
              borderRadius: "20px",
              padding: "45px 30px",
              textAlign: "center",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <AlertCircle
              size={55}
            />

            <h1>
              No Questions Available
            </h1>

            <p
              style={{
                marginTop: "12px",
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              There are currently no
              active questions for{" "}
              <strong>{subject}</strong>{" "}
              in the CBT Arena database.
            </p>

            <p
              style={{
                marginTop: "10px",
                color: "#667085",
              }}
            >
              Once questions are added
              through the database/admin
              system, they will appear here
              automatically.
            </p>

            <button
              className="hero-primary"
              style={{
                margin: "25px auto 0",
              }}
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

  // =========================================================
  // PRE-EXAM SCREEN
  // =========================================================

  if (!examStarted) {
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
                Examination Setup
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <Wifi
              size={17}
            />

            {internetConnected
              ? "Online"
              : "Offline"}
          </div>
        </header>

        <main
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "35px 20px 60px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "35px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "25px",
              }}
            >
              <div className="cbt-logo">
                C
              </div>

              <div>
                <h1
                  style={{
                    margin: 0,
                  }}
                >
                  {subject}
                </h1>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#667085",
                  }}
                >
                  CBT Arena Examination
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  borderRadius: "15px",
                  background: "#f8fafc",
                }}
              >
                <small>
                  Available Questions
                </small>

                <h2
                  style={{
                    margin: "8px 0 0",
                  }}
                >
                  {availableQuestionCount}
                </h2>
              </div>

              <div
                style={{
                  padding: "20px",
                  borderRadius: "15px",
                  background: "#f8fafc",
                }}
              >
                <small>
                  Selected Questions
                </small>

                <h2
                  style={{
                    margin: "8px 0 0",
                  }}
                >
                  {examQuestions.length}
                </h2>
              </div>

              <div
                style={{
                  padding: "20px",
                  borderRadius: "15px",
                  background: "#f8fafc",
                }}
              >
                <small>
                  Examination Time
                </small>

                <h2
                  style={{
                    margin: "8px 0 0",
                  }}
                >
                  {durationMinutes} mins
                </h2>
              </div>
            </div>

            {/* SETTINGS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "20px",
              }}
            >
              <label>
                <strong>
                  Number of Questions
                </strong>

                <select
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "13px",
                    borderRadius: "10px",
                    border:
                      "1px solid #d0d5dd",
                    background: "#fff",
                  }}
                >
                  {[20, 30, 50, 100, 150]
                    .filter(
                      (number) =>
                        number <=
                        availableQuestionCount
                    )
                    .map((number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        {number} Questions
                      </option>
                    ))}
                </select>
              </label>

              <label>
                <strong>
                  Examination Duration
                </strong>

                <select
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "13px",
                    borderRadius: "10px",
                    border:
                      "1px solid #d0d5dd",
                    background: "#fff",
                  }}
                >
                  {[30, 45, 60, 90, 120, 150, 180]
                    .map((number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        {number} Minutes
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {/* RULES */}

            <div
              style={{
                marginTop: "30px",
                padding: "22px",
                borderRadius: "15px",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                Examination Rules
              </h3>

              <ul
                style={{
                  lineHeight: 1.8,
                  color: "#475467",
                  paddingLeft: "20px",
                }}
              >
                <li>
                  Questions are randomly
                  selected from the database.
                </li>

                <li>
                  Your answers are tracked
                  during the examination.
                </li>

                <li>
                  You can move between
                  questions using the navigator.
                </li>

                <li>
                  You can flag questions for
                  later review.
                </li>

                <li>
                  Leaving the examination
                  window may generate an
                  integrity warning.
                </li>

                <li>
                  The examination timer cannot
                  be paused once started.
                </li>
              </ul>
            </div>

            {/* STATUS */}

            <div
              style={{
                marginTop: "25px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 16px",
                borderRadius: "12px",
                background:
                  internetConnected
                    ? "#ecfdf3"
                    : "#fef3f2",
              }}
            >
              {internetConnected ? (
                <CheckCircle2
                  size={20}
                />
              ) : (
                <AlertCircle
                  size={20}
                />
              )}

              <span>
                {internetConnected
                  ? "Internet connection detected. You are ready to continue."
                  : "Internet connection required."}
              </span>
            </div>

            {/* ACTIONS */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "15px",
                marginTop: "30px",
                flexWrap: "wrap",
              }}
            >
              <button
                className="hero-secondary"
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

              <button
                className="hero-primary"
                disabled={
                  !internetConnected ||
                  examQuestions.length === 0
                }
                onClick={beginExam}
              >
                Start Examination
                <ChevronRight
                  size={19}
                />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // EXAMINATION SCREEN
  // =========================================================

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
        {/* QUESTION AREA */}

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
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <small
                style={{
                  color: "#667085",
                }}
              >
                {question.year
                  ? `Year: ${question.year}`
                  : "Practice Question"}

                {question.paper
                  ? ` • Paper ${question.paper}`
                  : ""}
              </small>

              {question.difficulty && (
                <small
                  style={{
                    color: "#667085",
                  }}
                >
                  Difficulty:{" "}
                  {question.difficulty}
                </small>
              )}
            </div>

            <h1>
              {question.question}
            </h1>

            <div className="options">
              {question.options.map(
                (option, index) => (
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
                <Send
                  size={17}
                />

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

          <div
            className="navigator-legend"
          >
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
              (item, index) => {
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
                      goToQuestion(
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

          <div
            style={{
              marginTop: "25px",
              paddingTop: "20px",
              borderTop:
                "1px solid #eaecf0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "8px",
              }}
            >
              <span>
                Answered
              </span>

              <strong>
                {answeredCount}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "8px",
              }}
            >
              <span>
                Unanswered
              </span>

              <strong>
                {unansweredCount}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Flagged
              </span>

              <strong>
                {flaggedCount}
              </strong>
            </div>
          </div>

          {/* INTEGRITY */}

          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              borderRadius: "12px",
              background:
                violations > 0
                  ? "#fff7ed"
                  : "#f8fafc",
              display: "flex",
              gap: "10px",
            }}
          >
            <ShieldCheck
              size={19}
            />

            <div>
              <strong>
                Exam Integrity
              </strong>

              <div
                style={{
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                Violations:{" "}
                {violations}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* SUBMIT MODAL */}

      {showSubmit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#fff",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <Send
              size={40}
            />

            <h2>
              Submit Examination?
            </h2>

            <p
              style={{
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
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

            {unansweredCount >
              0 && (
              <p
                style={{
                  color: "#b54708",
                }}
              >
                {unansweredCount}{" "}
                question(s) remain
                unanswered.
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "12px",
                marginTop: "25px",
              }}
            >
              <button
                className="hero-secondary"
                onClick={() =>
                  setShowSubmit(
                    false
                  )
                }
              >
                Continue Exam
              </button>

              <button
                className="hero-primary"
                onClick={
                  finishExam
                }
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIOLATION MODAL */}

      {showViolation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#fff",
              borderRadius: "20px",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <ShieldAlert
              size={50}
            />

            <h2>
              Examination Warning
            </h2>

            <p
              style={{
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              {violationReason}
            </p>

            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                borderRadius: "10px",
                background: "#fff7ed",
              }}
            >
              Warning count:{" "}
              <strong>
                {violations}
              </strong>
            </div>

            <button
              className="hero-primary"
              style={{
                marginTop: "20px",
              }}
              onClick={() =>
                setShowViolation(
                  false
                )
              }
            >
              Continue Examination
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CBTExam;