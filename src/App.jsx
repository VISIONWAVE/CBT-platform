
import { useState } from "react";

import {
  BookOpen,
  Calculator,
  FlaskConical,
  Atom,
  Dna,
  TrendingUp,
  Trophy,
  Clock3,
  Target,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";

import CBTExam from "./components/CBTExam";
import "./index.css";

const subjects = [
  {
    name: "Use of English",
    short: "ENG",
    icon: BookOpen,
    questions: 250,
    color: "purple",
  },
  {
    name: "Mathematics",
    short: "MTH",
    icon: Calculator,
    questions: 300,
    color: "blue",
  },
  {
    name: "Biology",
    short: "BIO",
    icon: Dna,
    questions: 220,
    color: "green",
  },
  {
    name: "Chemistry",
    short: "CHE",
    icon: FlaskConical,
    questions: 240,
    color: "orange",
  },
  {
    name: "Physics",
    short: "PHY",
    icon: Atom,
    questions: 210,
    color: "red",
  },
  {
    name: "Economics",
    short: "ECO",
    icon: TrendingUp,
    questions: 180,
    color: "cyan",
  },
];

function App() {
  const [started, setStarted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [examSubject, setExamSubject] = useState(null);
  const [result, setResult] = useState(null);

  // =========================
  // RESULT SCREEN
  // =========================
  if (result) {
    return (
      <div className="result-page">
        <div className="result-card">
          <div className="result-icon">
            <Trophy size={45} />
          </div>

          <span className="eyebrow dark">EXAM COMPLETED</span>

          <h1>Well done! 🎉</h1>

          <div className="result-score">
            <strong>{result.score}%</strong>
            <span>Your Score</span>
          </div>

          <div className="result-stats">
            <div>
              <strong>{result.correct}</strong>
              <span>Correct</span>
            </div>

            <div>
              <strong>{result.wrong}</strong>
              <span>Wrong</span>
            </div>

            <div>
              <strong>{result.unanswered}</strong>
              <span>Unanswered</span>
            </div>
          </div>

          <div className="result-progress">
            <div
              style={{
                width: `${result.score}%`,
              }}
            ></div>
          </div>

          <p className="result-message">
            {result.score >= 80
              ? "Excellent performance! Keep up the great work."
              : result.score >= 60
              ? "Good performance. Keep practising to improve."
              : "Keep practising. You can definitely improve your score."}
          </p>

          <div className="result-actions">
            <button
              className="hero-primary"
              onClick={() => {
                setResult(null);
                setExamSubject(null);
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // CBT EXAM
  // =========================
  if (examSubject) {
    return (
      <CBTExam
        subject={examSubject}
        onCancel={() => {
          setExamSubject(null);
        }}
        onFinish={(answers, examQuestions) => {
          if (!examQuestions || examQuestions.length === 0) {
            setExamSubject(null);
            return;
          }

          let correct = 0;

          examQuestions.forEach((question) => {
            if (answers[question.id] === question.answer) {
              correct++;
            }
          });

          const total = examQuestions.length;
          const answered = Object.keys(answers).length;
          const wrong = answered - correct;
          const unanswered = total - answered;

          const score =
            total > 0
              ? Math.round((correct / total) * 100)
              : 0;

          setResult({
            score,
            correct,
            wrong,
            unanswered,
            total,
          });

          setExamSubject(null);
        }}
      />
    );
  }

  // =========================
  // LANDING PAGE
  // =========================
  if (!started) {
    return (
      <div className="landing">
        <div className="landing-glow glow-one"></div>
        <div className="landing-glow glow-two"></div>

        <nav className="landing-nav">
          <div className="brand">
            <div className="brand-logo">C</div>

            <div>
              <strong>CBT Arena</strong>
              <span>Exam Preparation Platform</span>
            </div>
          </div>

          <div className="nav-actions">
            <button className="text-button">Login</button>

            <button
              className="primary-button"
              onClick={() => setStarted(true)}
            >
              Get Started
            </button>
          </div>
        </nav>

        <main className="hero">
          <div className="hero-badge">
            <span></span>
            JAMB • WAEC • NECO PREPARATION
          </div>

          <h1>
            Prepare smarter.
            <br />
            <span>Pass with confidence.</span>
          </h1>

          <p>
            Practice thousands of CBT questions, take realistic mock exams,
            track your performance and prepare like you're already inside the
            examination hall.
          </p>

          <div className="hero-buttons">
            <button
              className="hero-primary"
              onClick={() => setStarted(true)}
            >
              Start Practising
              <ChevronRight size={20} />
            </button>

            <button className="hero-secondary">
              Explore Subjects
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>1,400+</strong>
              <span>Questions</span>
            </div>

            <div>
              <strong>6</strong>
              <span>Subjects</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Practice</span>
            </div>

            <div>
              <strong>100%</strong>
              <span>CBT Ready</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // DASHBOARD
  // =========================
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">C</div>

          <div>
            <strong>CBT Arena</strong>
            <span>Student Portal</span>
          </div>
        </div>

        <div className="profile-mini">
          <div className="avatar">
            <User size={20} />
          </div>

          <div>
            <strong>Welcome, Student</strong>
            <span>Keep pushing 🚀</span>
          </div>
        </div>

        <div className="menu-title">MAIN MENU</div>

        <button className="side-link active">
          <Target size={19} />
          Dashboard
        </button>

        <button className="side-link">
          <BookOpen size={19} />
          Practice
        </button>

        <button className="side-link">
          <Clock3 size={19} />
          Mock Exams
        </button>

        <button className="side-link">
          <Trophy size={19} />
          Leaderboard
        </button>

        <button className="side-link">
          <TrendingUp size={19} />
          Performance
        </button>

        <button className="side-link">
          <Clock3 size={19} />
          Exam History
        </button>

        <div className="sidebar-bottom">
          <button
            className="side-link"
            onClick={() => {
              setStarted(false);
              setExamSubject(null);
              setResult(null);
              setMobileMenu(false);
            }}
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </aside>

      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <section className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>

          <div>
            <span className="topbar-label">STUDENT DASHBOARD</span>
            <h2>Good afternoon 👋</h2>
          </div>

          <div className="topbar-user">
            <div className="notification">3</div>

            <div className="avatar small">
              <User size={18} />
            </div>
          </div>
        </header>

        <main className="dashboard">
          <section className="welcome-card">
            <div>
              <span className="eyebrow">
                READY FOR YOUR NEXT TEST?
              </span>

              <h1>Let's sharpen your skills.</h1>

              <p>
                Choose a subject below and start practising. Your progress is
                automatically tracked.
              </p>

              <button className="white-button">
                Start a Mock Exam
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="welcome-graphic">
              <Trophy size={100} strokeWidth={1.2} />
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple-bg">
                <Target />
              </div>

              <div>
                <span>Average Score</span>
                <strong>78%</strong>
              </div>

              <small>+8% this month</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue-bg">
                <BookOpen />
              </div>

              <div>
                <span>Questions Done</span>
                <strong>342</strong>
              </div>

              <small>42 this week</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange-bg">
                <Clock3 />
              </div>

              <div>
                <span>Exams Completed</span>
                <strong>18</strong>
              </div>

              <small>3 this month</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-bg">
                <Trophy />
              </div>

              <div>
                <span>Best Score</span>
                <strong>92%</strong>
              </div>

              <small>Personal best</small>
            </div>
          </section>

          <section className="section-header">
            <div>
              <span className="eyebrow dark">PRACTICE</span>
              <h2>Choose a subject</h2>
            </div>

            <button className="view-all">
              View all <ChevronRight size={17} />
            </button>
          </section>

          <section className="subjects-grid">
            {subjects.map((subject) => {
              const Icon = subject.icon;

              return (
                <div
                  className="subject-card"
                  key={subject.name}
                  onClick={() => {
                    setExamSubject(subject.name);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className={`subject-icon ${subject.color}`}>
                    <Icon size={25} />
                  </div>

                  <div className="subject-info">
                    <span>{subject.short}</span>
                    <h3>{subject.name}</h3>
                    <p>{subject.questions} questions available</p>
                  </div>

                  <button className="subject-arrow">
                    <ChevronRight size={19} />
                  </button>
                </div>
              );
            })}
          </section>

          <section className="bottom-grid">
            <div className="recent-card">
              <div className="card-header">
                <div>
                  <span className="eyebrow dark">ACTIVITY</span>
                  <h2>Recent exams</h2>
                </div>

                <button className="view-all">
                  View history
                </button>
              </div>

              <div className="exam-row">
                <div className="exam-icon">EN</div>

                <div className="exam-name">
                  <strong>Use of English</strong>
                  <span>50 Questions • 35 mins</span>
                </div>

                <div className="exam-score">
                  <strong>84%</strong>
                  <span>Excellent</span>
                </div>
              </div>

              <div className="exam-row">
                <div className="exam-icon blue">MA</div>

                <div className="exam-name">
                  <strong>Mathematics</strong>
                  <span>40 Questions • 30 mins</span>
                </div>

                <div className="exam-score">
                  <strong>76%</strong>
                  <span>Good</span>
                </div>
              </div>

              <div className="exam-row">
                <div className="exam-icon green">BI</div>

                <div className="exam-name">
                  <strong>Biology</strong>
                  <span>50 Questions • 40 mins</span>
                </div>

                <div className="exam-score">
                  <strong>91%</strong>
                  <span>Excellent</span>
                </div>
              </div>
            </div>

            <div className="leader-card">
              <div className="card-header">
                <div>
                  <span className="eyebrow dark">COMPETE</span>
                  <h2>Leaderboard</h2>
                </div>

                <Trophy size={25} />
              </div>

              <div className="leader">
                <span>01</span>
                <div className="leader-avatar">A</div>
                <strong>Ademola</strong>
                <b>96%</b>
              </div>

              <div className="leader">
                <span>02</span>
                <div className="leader-avatar">M</div>
                <strong>Mariam</strong>
                <b>94%</b>
              </div>

              <div className="leader current">
                <span>07</span>
                <div className="leader-avatar">S</div>
                <strong>You</strong>
                <b>78%</b>
              </div>

              <button className="leader-button">
                View Full Leaderboard
              </button>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}

export default App;

