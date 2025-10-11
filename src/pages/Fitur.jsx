import React from "react";

export default function Fitur() {
  return (
    <section style={styles.featuresSection}>
      {/* CSS responsif untuk ikon */}
      <style>{`
        .f-circle{ width:clamp(56px,12vw,80px); height:clamp(56px,12vw,80px); }
        .f-icon{ width:clamp(22px,6vw,32px); height:clamp(22px,6vw,32px); }
        @media (max-width:520px){
          .features-wrap{ padding:48px 0; }
          .features-title{ font-size:32px !important; }
        }
      `}</style>

      <div className="features-wrap" style={styles.container}>
        <div style={styles.header}>
          <h2 className="features-title font-poppins-bold" style={styles.title}>
            Why This <span style={styles.orangeText}>Interactive Web</span>?
          </h2>

          <div style={styles.description}>
            <p className="font-poppins-regular" style={styles.descriptionText}>
              This web-based interactive book is specially designed to help university students
              enhance their English skills anytime and anywhere.
            </p>
            <p className="font-poppins-regular" style={styles.descriptionText}>
              With a modern, user-friendly interface, students can access lessons, practice
              exercises, and receive instant feedback in just a few clicks.
            </p>
          </div>
        </div>

        <div style={styles.featuresGrid}>
          {/* 1 */}
          <div style={styles.featureCard}>
            <div className="f-circle" style={{...styles.iconCircle, backgroundColor:'#e5dbff'}}>
              <svg className="f-icon" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="15" rx="2" stroke="#8b5cf6" strokeWidth="2"/>
                <path d="M8 2v4M16 2v4" stroke="#8b5cf6" strokeWidth="2"/>
                <rect x="6" y="8" width="4" height="4" fill="#8b5cf6"/>
                <rect x="14" y="8" width="4" height="4" fill="#8b5cf6"/>
                <rect x="10" y="12" width="4" height="4" fill="#8b5cf6"/>
              </svg>
            </div>
            <h3 className="font-poppins-regular" style={styles.featureTitle}>Complete Modules</h3>
            <p className="font-poppins-small" style={styles.featureDescription}>Covering listening, speaking, reading, and writing.</p>
          </div>

          {/* 2 */}
          <div style={styles.featureCard}>
            <div className="f-circle" style={{...styles.iconCircle, backgroundColor:'#fed7aa'}}>
              <svg className="f-icon" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" stroke="#f97316" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="#f97316" strokeWidth="2"/>
                <path d="M12 3v1M21 12h-1M12 21v-1M3 12h1" stroke="#f97316" strokeWidth="1"/>
              </svg>
            </div>
            <h3 className="font-poppins-regular" style={styles.featureTitle}>Progress Tracking</h3>
            <p className="font-poppins-small" style={styles.featureDescription}>
              Monitor achievements, scores, and learning progress with personalized reports.
            </p>
          </div>

          {/* 3 */}
          <div style={styles.featureCard}>
            <div className="f-circle" style={{...styles.iconCircle, backgroundColor:'#bfdbfe'}}>
              <svg className="f-icon" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="8" y1="21" x2="16" y2="21" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="12" y1="17" x2="12" y2="21" stroke="#3b82f6" strokeWidth="2"/>
                <rect x="6" y="7" width="4" height="6" fill="#3b82f6"/>
                <rect x="14" y="7" width="4" height="6" fill="#3b82f6"/>
              </svg>
            </div>
            <h3 className="font-poppins-regular" style={styles.featureTitle}>Accessible Anywhere</h3>
            <p className="font-poppins-small" style={styles.featureDescription}>
              Accessible Anywhere, study anytime with internet connection.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  featuresSection:{ background:"#fff", padding:"80px 0", fontFamily:"Arial, sans-serif" },
  container:{ maxWidth:"1200px", margin:"0 auto", padding:"0 20px" },
  header:{ textAlign:"center", marginBottom:"60px" },
  title:{ fontSize:"42px", fontWeight:700, color:"#1e293b", marginBottom:"40px", lineHeight:1.2 },
  orangeText:{ color:"#f97316" },
  description:{ maxWidth:"800px", margin:"0 auto" },
  descriptionText:{ fontSize:"16px", color:"#64748b", lineHeight:1.6, marginBottom:"20px" },
  featuresGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"40px", maxWidth:"1000px", margin:"0 auto" },
  featureCard:{ textAlign:"center", padding:"20px" },
  iconCircle:{ borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 22px" },
  featureTitle:{ fontSize:"24px", fontWeight:600, color:"#1e293b", marginBottom:"12px", lineHeight:1.3 },
  featureDescription:{ fontSize:"15px", color:"#64748b", lineHeight:1.6, maxWidth:"280px", margin:"0 auto" },
};
