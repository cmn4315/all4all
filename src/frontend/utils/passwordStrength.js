
const LEVELS = [
  {label: "Very Weak", color: "#ef4444"},
  {label: "Weak", color: "#f97316"},
  {label: "Fair", color: "#f59e0b"},
  {label: "Good", color: "#84cc16"},
  {label: "Strong", color: "#22c55e"},
  {label: "Very Strong",color: "#10b981"},
];

export function getPasswordStrength(p) {
    if (!p){
        return { score: 0, label: "", pct: 0, color: "#e2e8f0" };
    }

    let s = 0;
    if (p.length >= 8){
        s++; // minimum length
    }
    if (p.length >= 12){
        s++; // longer is better
    }
    if (/[A-Z]/.test(p)){
        s++; // uppercase
    }
    if (/[a-z]/.test(p)){
        s++; // lowercase
    }
    if (/[0-9]/.test(p)){
        s++; // number
    }
    if (/[^A-Za-z0-9]/.test(p)){
        s++; // special character
    }

    const i = Math.min(s, LEVELS.length - 1);
    return {
        score: s,
        label: LEVELS[i].label,
        pct: Math.round((s / 6) * 100),
        color: LEVELS[i].color,
    };
}