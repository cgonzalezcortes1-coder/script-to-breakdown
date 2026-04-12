import React, { useState, useEffect, createContext, useContext } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useI18n } from '../i18n';

const provider = new GoogleAuthProvider();

export const AuthContext = createContext({ isAdmin: false });
export const useAuth = () => useContext(AuthContext);

export default function PasswordGate({ children }) {
  const { t, lang, toggleLang } = useI18n();

  // undefined = cargando, null = no autenticado, objeto = usuario autorizado
  const [authUser, setAuthUser]   = useState(undefined);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [denied, setDenied]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setAuthUser(null); setIsAdmin(false); setDenied(false); return; }

      // Verificar si el email está en la whitelist
      const snap = await getDoc(doc(db, 'allowedUsers', u.email));
      if (snap.exists()) {
        setAuthUser(u);
        setIsAdmin(snap.data()?.isAdmin === true);
        setDenied(false);
      } else {
        await signOut(auth);
        setAuthUser(null);
        setIsAdmin(false);
        setDenied(true);
      }
    });
  }, []);

  const signIn = async () => {
    setError('');
    setDenied(false);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(t('loginError'));
        console.error(err);
      }
    }
  };

  if (authUser === undefined) return null;   // cargando
  if (authUser)              return <AuthContext.Provider value={{ isAdmin }}>{children}</AuthContext.Provider>;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>

        <div style={styles.brand}>
          <div style={styles.brandTitle}>
            <span style={styles.brandOrange}>HASAN</span> Script Breakdown
          </div>
          <div style={styles.brandSub}>{t('appSubtitle')}</div>
        </div>

        <div style={styles.divider} />

        {denied ? (
          <>
            <p style={{ ...styles.desc, color: '#C0392B', fontWeight: 600 }}>
              {t('accessDenied')}
            </p>
            <p style={{ ...styles.desc, marginBottom: '20px' }}>
              {t('contactAdmin')}
            </p>
            <button onClick={signIn} style={{ ...styles.googleBtn, fontSize: '0.8rem' }}>
              {t('tryAnother')}
            </button>
          </>
        ) : (
          <>
            <p style={styles.desc}>
              {t('loginDesc')}
            </p>
            <button onClick={signIn} style={styles.googleBtn}>
              <GoogleIcon />
              {t('loginBtn')}
            </button>
          </>
        )}

        {error && <div style={styles.errorMsg}>{error}</div>}

        <div style={styles.footerRow}>
          <div style={styles.motto}>{t('motto')}</div>
          <button onClick={toggleLang} style={styles.langBtn}>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
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
  footerRow: {
    marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  motto: { fontSize: '0.68rem', color: '#CACACA', fontStyle: 'italic', letterSpacing: '0.05em' },
  langBtn: {
    background: 'none', border: '1px solid #CACACA', borderRadius: '4px',
    padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, color: '#8A8A8A',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    transition: 'color 0.15s, border-color 0.15s',
  },
};
