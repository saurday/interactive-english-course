import React from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "../assets/images/hero.png";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .hero{ background:#f8f9ff; padding:clamp(32px,6vw,80px) 0; font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
        .hero-wrap{ width:min(1200px,92%); margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:clamp(16px,4vw,48px); }
        .hero-left{ flex:1; max-width:560px; }
        .hero-title{ font-weight:800; font-size:clamp(26px,3.2vw + 8px,54px); line-height:1.2; color:#333; margin:0 0 14px; }
        .hero-title .accent{ color:#8b5cf6; }
        .hero-desc{ font-size:clamp(13px,.5vw + 11px,18px); color:#666; line-height:1.7; margin:16px 0 18px; }
        /* tombol mengecil halus */
        .hero-cta{
          background:#8b5cf6; color:#fff; border:0; border-radius:clamp(8px,1.4vw,12px);
          padding:clamp(10px,1.8vw,14px) clamp(16px,3vw,28px);
          font-weight:800; font-size:clamp(14px,1.6vw,16px); cursor:pointer;
          transition:transform .2s ease, box-shadow .2s ease, background-color .2s ease;
        }
        .hero-cta:hover{ background:#7c3aed; transform:scale(1.05); box-shadow:0 8px 20px rgba(139,92,246,.4); }

        .hero-right{ flex:1; display:flex; justify-content:center; align-items:center; }
        /* gambar mengecil dengan clamp */
        .img-wrap{ --size:clamp(200px,50vw,460px); --bg:calc(var(--size) - clamp(22px,4vw,60px)); width:var(--size); height:var(--size); position:relative; }
        .circle-bg{ position:absolute; width:var(--bg); height:var(--bg); background:#8b5cf6; border-radius:50%; top:clamp(10px,1.6vw,24px); left:clamp(10px,1.6vw,24px); z-index:1; }
        .hero-img{ position:absolute; inset:0; margin:auto; width:100%; height:100%; object-fit:contain; z-index:2; }
        .dot-a{ position:absolute; width:clamp(22px,5vw,64px); height:clamp(22px,5vw,64px); background:#e5dbff; border-radius:50%; top:clamp(-8px,-1vw,-12px); right:clamp(-8px,-1vw,-12px); z-index:0; }
        .dot-b{ position:absolute; width:clamp(18px,3.5vw,46px); height:clamp(18px,3.5vw,46px); background:#8b5cf6; border-radius:50%; bottom:clamp(8px,2vw,24px); left:clamp(-10px,-1vw,-14px); z-index:0; }

        /* tablet & mobile: tumpuk + rata tengah */
        @media (max-width:980px){ .hero-wrap{ flex-direction:column-reverse; text-align:center; } .hero-left{ max-width:720px; } .hero-cta{ margin-inline:auto; } }
        /* ekstra kecil (≤360px): kecilkan lagi gambar */
        @media (max-width:360px){ .img-wrap{ --size:180px; } }
      `}</style>

      <section className="hero">
        <div className="hero-wrap">
          <div className="hero-left">
            <h1 className="hero-title font-inter-bold">
              Upgrade Your <br />
              <span className="accent">English Skills</span> for the Future
            </h1>
            <p className="hero-desc font-inter-regular">
              An interactive textbook designed to improve students' English language skills through engaging and flexible learning
            </p>
            <button className="hero-cta" onClick={() => navigate("/login")}>Start Learning Now</button>
          </div>

          <div className="hero-right">
            <div className="img-wrap">
              <div className="circle-bg" />
              <img className="hero-img" src={heroImage} alt="Happy student" />
              <div className="dot-a" />
              <div className="dot-b" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
