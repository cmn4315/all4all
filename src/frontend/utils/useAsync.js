import { useState, useCallback, useRef } from "react";

export function useAsync(syncFn, asyncFn, asyncMsg) {
    const [val, setVal] = useState("");
    const [err, setErr] = useState(null);
    const [checking,setChecking] = useState(false);
    const timer = useRef(null);

    const onChange = useCallback((raw) => {
        const v = typeof raw === "string" ? raw : raw.target.value;
       
        setVal(v);
        clearTimeout(timer.current);

        const syncErr = syncFn(v);
        if (syncErr) { 
            setErr(syncErr); setChecking(false); 
            return; 
        }

        if (asyncFn && v) {
            setChecking(true); setErr(null);
            timer.current = setTimeout(async () => {
                const ok = await asyncFn(v);
                setChecking(false);
                setErr(ok ? null : asyncMsg);
            }, 500);
        } 
        else {
            setErr(null);
        }
    }, [syncFn, asyncFn, asyncMsg]);

    return { val, err, checking, onChange };
}