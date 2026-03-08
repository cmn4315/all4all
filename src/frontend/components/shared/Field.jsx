export default function Field({ label, error, checking, hint, children }) {
  return (
    <div className="a4a-field">
      <label className="a4a-label">{label}</label>
      
      {children}
      {checking && <p className="a4a-checking">Checking…</p>}
      {!checking && error && <p className="a4a-err">{error}</p>}
      {!error && !checking && hint && <p className="a4a-hint">{hint}</p>}
    </div>
  );
}