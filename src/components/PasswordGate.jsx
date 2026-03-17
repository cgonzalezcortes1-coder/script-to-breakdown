import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const provider = new GoogleAuthProvider();

export default function PasswordGate({ children }) {
  // undefined = cargando auth, null = no autenticado, objeto = usuario
  const [authUser, setAuthUser] = useState(undefined);
  const [error, setError]       = useState('');

  useEffect(() => {
    // Firebase persiste la sesión en IndexedDB automáticamente
    return onAuthStateChanged(auth, (u) => setAuthUser(u ?? null));
  }, []);

  const signIn = async () => {
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión. Intenta de nuevo.');
        console.error(err);
      }
    }
  };

  if (authUser === undefined) return null;   // cargando
  if (authUser)              return children; // autenticado

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>

        <div style={styles.brand}>
          <div style={styles.brandTitle}>
            <span style={styles.brandOrange}>HASAN</span> Script Breakdown
          </div>
          <div style={styles.brandSub}>Desglose de Sonido · Sound Department</div>
        </div>

        <div style={styles.divider} />

        <p style={styles.desc}>
          Accede con la cuenta Google del equipo para continuar.
        </p>

        <button onClick={signIn} style={styles.googleBtn}>
          <GoogleIcon />
          Acceder con Google
        </button>

        {error && <div style={styles.errorMsg}>{error}</div>}

        <div style={styles.footer}>escuchar es mirar</div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: '#F6F4F0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif", zIndex: 99999,
  },
  card: {
    background: '#FFFFFF', border: '1px solid #E4E4E4',
    borderTop: '3px solid #F5A623', borderRadius: '12px',
    padding: '40px 44px 32px', width: '100%', maxWidth: '380px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    display: 'flex', flexDirection: 'column',
  },
  brand: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' },
  brandTitle: {
    fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem',
    fontWeight: 400, color: '#1C1C1C', letterSpacing: '-0.02em',
  },
  brandOrange: { color: '#F5A623' },
  brandSub: {
    fontSize: '0.62rem', fontWeight: 600, color: '#8A8A8A',
    textTransform: 'uppercase', letterSpacing: '0.18em',
  },
  divider: { height: '1px', background: '#E4E4E4', marginBottom: '24px' },
  desc: { fontSize: '0.85rem', color: '#484848', marginBottom: '20px', lineHeight: 1.5 },
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '11px 16px', background: '#fff',
    border: '1.5px solid #CACACA', borderRadius: '8px',
    color: '#1C1C1C', fontWeight: 600, fontSize: '0.9rem',
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  errorMsg: { marginTop: '12px', fontSize: '0.75rem', color: '#C0392B', fontWeight: 600, textAlign: 'center' },
  footer: { marginTop: '28px', textAlign: 'center', fontSize: '0.68rem', color: '#CACACA', fontStyle: 'italic', letterSpacing: '0.05em' },
};
