import React from "react";
import { CheckCircle2, Sparkles, BookOpenCheck } from "lucide-react";

export default function About() {
  return (
    <>
      <style>{`
        :root{ --violet:#6b46c1; --violet-700:#553c9a; }
        body{ background:#fbfbfb; font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        .wrap{ max-width:1100px; margin:0 auto; padding:24px 20px 60px; }

        .hero{
          background:#f5f3ff; border:1px solid #e9d5ff; border-radius:16px;
          padding:34px; display:grid; grid-template-columns: 1.2fr 1fr;
          gap:24px; align-items:center;
        }
        /* Mobile: 1 kolom + avatar disembunyikan */
        @media (max-width: 920px){
          .hero{ grid-template-columns:1fr; padding:22px; }
          .avatar{ display:none; }
        }

        .title{ font-size: clamp(26px, 2.4vw + 10px, 44px); font-weight:800; margin:0 0 10px; }
        .lead{ color:#475569; line-height:1.7; }
        .pill{ display:inline-flex; gap:8px; align-items:center; padding:8px 12px; border-radius:999px; background:#fff; border:1px solid #e5e7eb; font-weight:700; }

        .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-top:22px; }
        @media (max-width: 820px){ .grid-2{ grid-template-columns:1fr; } }

        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:18px; box-shadow:0 4px 18px rgba(0,0,0,.06); }
        .mini{ display:flex; gap:10px; align-items:flex-start; }

        /* Avatar circle */
        .avatar{
          position: relative; width:100%; max-width:300px; aspect-ratio:1/1;
          border-radius:50%; overflow:hidden; background:#6b46c1; margin:0 auto;
        }
        .avatar img{
          position:absolute; inset:0; width:100%; height:100%;
          object-fit:cover; object-position:center; display:block;
        }

        .section-title{ font-weight:800; font-size: clamp(20px, 1.4vw + 10px, 28px); margin:26px 0 10px; }
        .muted{ color:#64748b; }
      `}</style>

      <div className="wrap">
        <section className="hero">
          <div>
            <div className="pill" style={{ marginBottom: 10 }}>
              <Sparkles size={16}/> Interactive English Course
            </div>
            <h1 className="title">About this Web</h1>
            <p className="lead">
              Interactive English Course helps <b>students</b> build English skills
              through bite-sized weekly steps, quick practice, and clear progress.
              Learn at your own pace with videos, readings, quizzes, and discussions—
              all in one place.
            </p>

            <div style={{ display:"grid", gap:12, marginTop:12 }}>
              <div className="mini">
                <CheckCircle2 color="#16a34a" size={18}/>
                <div><b>Guided</b><div className="muted">Each week is split into steps so you always know what’s next.</div></div>
              </div>
              <div className="mini">
                <CheckCircle2 color="#16a34a" size={18}/>
                <div><b>Practical</b><div className="muted">Real tasks: watch, read, answer, submit, and discuss.</div></div>
              </div>
              <div className="mini">
                <CheckCircle2 color="#16a34a" size={18}/>
                <div><b>Trackable</b><div className="muted">Your progress is saved to the database—resume anytime.</div></div>
              </div>
            </div>
          </div>

          {/* Disembunyikan otomatis saat <=920px */}
          <div className="avatar">
            <img
              loading="lazy"
              src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80"
              alt="Student"
            />
          </div>
        </section>

        <section className="grid-2">
          <div className="card">
            <h3 className="section-title">What you’ll experience</h3>
            <p className="muted">
              Simple navigation, clear steps, instant previews for files and videos,
              and quick feedback from quizzes or instructors. You can mark items as
              complete and see your progress grow each week.
            </p>
          </div>
          <div className="card">
            <h3 className="section-title">Designed for learners</h3>
            <p className="muted">
              Lightweight and distraction-free. Whether on laptop or phone, everything
              stays readable and fast so you can focus on learning English.
            </p>
          </div>
        </section>

        <p className="muted" style={{ textAlign:"center", marginTop:28 }}>
          Learn smarter, not harder. <BookOpenCheck size={16} style={{verticalAlign:"-3px"}}/>
        </p>
      </div>
    </>
  );
}
