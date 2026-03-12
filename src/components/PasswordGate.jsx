import React, { useState, useEffect, useRef } from 'react';

const PASSWORD    = 'Dogm@n_2025!';
const SESSION_KEY = 'hasan_auth';

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue]       = useState('');
  const [error, setError]       = useState(false);
  const [shake, setShake]       = useState(false);
  const inputRef = useRef(null);

  // Already authenticated this session?
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) setTimeout(() => inputRef.current?.focus(), 50);
  }, [unlocked]);

  const attempt = (e) => {
    e.preventDefault();
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (unlocked) return children;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandTitle}>
            <span style={styles.brandOrange}>HASAN</span> Script Breakdown
          </div>
          <div style={styles.brandSub}>Desglose de Sonido · Sound Department</div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Form */}
        <form onSubmit={attempt} style={styles.form}>
          <label style={styles.label}>Contraseña de acceso</label>
          <div style={{ ...styles.inputWrap, ...(shake ? styles.shake : {}) }}>
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              placeholder="••••••••••••"
              style={{
                ...styles.input,
                ...(error ? styles.inputError : {}),
              }}
              autoComplete="current-password"
            />
          </div>
          {error && <div style={styles.errorMsg}>Contraseña incorrecta</div>}
          <button type="submit" style={styles.btn}>
            Entrar →
          </button>
        </form>

        <div style={styles.footer}>escuchar es mirar</div>
      </div>
    </div>
  );
}

/* ── Inline styles (no CSS file dependency) ── */
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#F6F4F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 99999,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E4E4E4',
    borderTop: '3px solid #F5A623',
    borderRadius: '12px',
    padding: '40px 44px 32px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '24px',
  },
  brandTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '1.5rem',
    fontWeight: 400,
    color: '#1C1C1C',
    letterSpacing: '-0.02em',
  },
  brandOrange: {
    color: '#F5A623',
  },
  brandSub: {
    fontSize: '0.62rem',
    fontWeight: 600,
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
  },
  divider: {
    height: '1px',
    background: '#E4E4E4',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#8A8A8A',
    marginBottom: '2px',
  },
  inputWrap: {
    display: 'flex',
  },
  input: {
    width: '100%',
    padding: '10px 13px',
    background: '#FFFFFF',
    border: '1.5px solid #E4E4E4',
    borderRadius: '7px',
    color: '#1C1C1C',
    fontSize: '1rem',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.1em',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputError: {
    borderColor: '#C0392B',
    boxShadow: '0 0 0 3px rgba(192,57,43,0.12)',
  },
  errorMsg: {
    fontSize: '0.75rem',
    color: '#C0392B',
    fontWeight: 600,
    marginTop: '-4px',
  },
  btn: {
    marginTop: '6px',
    padding: '11px',
    background: '#F5A623',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.9rem',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    transition: 'background 0.15s',
    letterSpacing: '0.01em',
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
    fontSize: '0.68rem',
    color: '#CACACA',
    fontStyle: 'italic',
    letterSpacing: '0.05em',
  },
  shake: {
    animation: 'shake 0.45s ease',
  },
};

/* Inject shake keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('hasan-shake-style')) {
  const s = document.createElement('style');
  s.id = 'hasan-shake-style';
  s.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-5px); }
      80%      { transform: translateX(5px); }
    }
    #hasan-shake-style + * .shake-target { animation: shake 0.45s ease; }
  `;
  document.head.appendChild(s);
}
