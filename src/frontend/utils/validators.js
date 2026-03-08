import { _users, _orgUsernames, _emails, _orgEmails, delay } from "./store";

//username 
export function validateUsernameFormat(u) {
    if (!u){
        return "Username is required.";
    }
    if (u.length < 3){
        return "At least 3 characters.";
    }
    if (u.length > 30){
        return "At most 30 characters.";
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(u)){
        return "Letters, numbers, _ . - only.";
    }

    return null;
}

export async function isUsernameAvailable(u) {
    await delay();
    return !_users.has(u.toLowerCase()) && !_orgUsernames.has(u.toLowerCase());
}

//email
export function validateEmail(e) {
    if (!e){
        return "Email is required.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){
        return "Enter a valid email.";
    }
    return null;
}

export async function isEmailAvailable(e) {
    await delay();
    return !_emails.has(e.toLowerCase()) && !_orgEmails.has(e.toLowerCase());
}

// phone number 
export function validatePhone(p) {
    if (!p) {
        return "Phone number is required.";
    }
    if (p.replace(/\D/g, "").length < 10){
        return "Enter a valid 10-digit number.";
    }
    return null;
}

export function formatPhone(v) {
    const d = v.replace(/\D/g, "").slice(0, 10);
    
    if (d.length <= 3){
        return d;
    }
    if (d.length <= 6){
        return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    }

    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}


//zip
export function validateZip(z) {
    if (!z){
        return null;
    }

    if (!/^\d{5}(-\d{4})?$/.test(z)){
        return "Valid ZIP required (e.g. 90210).";
    }

    return null;
}

// password
export function validatePassword(p) {
    if (!p){
        return "Password is required.";
    }
    if (p.length < 8){
        return "At least 8 characters required.";
    }

    let s = 0;
    if (p.length >= 8){
        s++;
    }
    if (p.length >= 12){
        s++;
    }
    if (/[A-Z]/.test(p)){
        s++;
    }
    if (/[a-z]/.test(p)){
        s++;
    }
    if (/[0-9]/.test(p)){
        s++;
    }
    if (/[^A-Za-z0-9]/.test(p)){
        s++;
    }

    if (s < 2){
        return "Too weak — add more variety.";
    }
    return null;
}

// hex color 
export function isValidHex(h) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h);
}

export function normalizeHex(raw) {
    const s = (raw || "").trim();
    return s.startsWith("#") ? s : `#${s}`;
}