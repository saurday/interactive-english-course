import React from "react";
import {
  Layers, Video, FileText, MessageSquare, Award, Gauge, Smartphone, CheckCircle2,
} from "lucide-react";

export default function Features() {
  const items = [
    { icon: <Layers size={22} />,       title: "Guided Weekly Steps",
      desc: "Follow a clear path each week—open the next step after you finish the current one." },
    { icon: <Video size={22} />,        title: "Instant Video & Embed",
      desc: "Play YouTube/Video in-page without popups or new tabs." },
    { icon: <FileText size={22} />,     title: "Readable Materials",
      desc: "View files directly on the page—no need to download first." },
    { icon: <Award size={22} />,        title: "Quizzes with Feedback",
      desc: "Start, submit, and review your attempts. See scores so you know where to improve." },
    { icon: <MessageSquare size={22} />,title: "Discussion per Step",
      desc: "Ask questions and get help right under each material." },
    { icon: <Gauge size={22} />,        title: "Progress Tracking",
      desc: "Mark items as complete; your progress is saved to the database and synced across devices." },
    { icon: <Smartphone size={22} />,   title: "Mobile Friendly",
      desc: "Learn comfortably on phones or laptops with a clean, responsive layout." },
    { icon: <CheckCircle2 size={22} />, title: "Finish Flow",
      desc: "When you reach the last step, the Next button becomes Finish and returns to your dashboard." },
  ];

  return (
    <>
      <style>{`
        :root{ --violet:#6b46c1; --violet-700:#553c9a; }
        body{ background:#fbfbfb; font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

        /* Page wrapper: max width + comfy padding (adds gap from navbar) */
        .fe-wrap{
          width: min(1100px, 92%);
          margin-inline: auto;
          padding: clamp(18px, 2.5vw, 28px) 0 60px;
          /* side padding so cards don't touch edges on mobile */
          padding-inline: clamp(12px, 4vw, 24px);
          box-sizing: border-box;
        }

        .fe-title{
          font-size: clamp(28px, 2.2vw + 14px, 42px);
          font-weight: 900;
          margin: 8px 0 6px;
        }
        .fe-lead{ color:#475569; margin: 0 0 12px; }

        /* Safe grid: minmax(0,1fr) prevents overflow; good gaps */
        .fe-grid{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-top: 16px;
        }
        @media (max-width: 1100px){ .fe-grid{ grid-template-columns: repeat(3, minmax(0,1fr)); } }
        @media (max-width: 820px){  .fe-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 560px){  .fe-grid{ grid-template-columns: minmax(0,1fr); } }

        .fe-card{
          display:flex;
          gap:12px;
          align-items:flex-start;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:16px;
          width:100%;
          max-width:100%;
          box-sizing:border-box; /* avoid overflow from padding/border */
        }
        .fe-icon{
          width:42px; height:42px; flex:0 0 42px;
          border-radius:12px;
          background:#ede9fe; color:var(--violet);
          display:flex; align-items:center; justify-content:center;
        }
        .fe-card h4{ margin:2px 0 4px; font-size:16px; font-weight:800; }
        .fe-muted{ color:#64748b; }
      `}</style>

      <div className="fe-wrap">
        <h1 className="fe-title">Features</h1>
        <p className="fe-lead">
          Everything students need to learn English effectively—clear steps,
          instant previews, quizzes, and progress.
        </p>

        <div className="fe-grid">
          {items.map((f, i) => (
            <div key={i} className="fe-card">
              <div className="fe-icon">{f.icon}</div>
              <div>
                <h4>{f.title}</h4>
                <div className="fe-muted">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
