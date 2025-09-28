import React from "react";

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <h4 className="font-inter-extra-bold" style={styles.title}>Interactive English Course</h4>
      <p className="font-inter-regular"style={styles.copyright}>&copy; 2025 Interactive English Course – All Rights Reserved</p>
      <p className="font-poppins-regular"style={styles.developer}>Developed by Universitas Trunojoyo Madura</p>
    </footer>
  );
};

const styles = {
  footer: {
    width: "100%",                 // penuh
    backgroundColor: "#7451d0",
    color: "#fff",
    textAlign: "center",
    padding: "20px 12px",
    lineHeight: 1.4,
  },
  title: { margin: "0 0 8px 0", fontSize: 16, fontWeight: 800 },
  copyright: { margin: "0 0 6px 0", fontSize: 14 },
  developer: { margin: 0, fontSize: 13 },
};

export default Footer;