import { useState } from "react";
import { isValidHex, normalizeHex } from "../utils/validators";

export default function ColorWheelPicker({ selectedColors, onChange }) {
    const [wheelColor, setWheelColor] = useState("#16a34a");
    const [hexInput, setHexInput] = useState("#16a34a");
    const [hexErr, setHexErr] = useState(null);


    function handleWheel(e) {
        const h = e.target.value;
        setWheelColor(h);
        setHexInput(h);
        setHexErr(null);
    }

    function handleHexText(e) {
        const raw = e.target.value;
        setHexInput(raw);
        setHexErr(null);
        const norm = normalizeHex(raw);
        
        if (isValidHex(norm)){
            setWheelColor(norm);
        }
    }

    function addColor() {
        const norm = normalizeHex(hexInput).toLowerCase();
        if (!isValidHex(norm)){ 
            setHexErr("Enter a valid hex (e.g. #FF5733)."); 
            return; 
        }

        if (selectedColors.includes(norm)){
            setHexErr("Already added."); 
            return;
        }

        if(selectedColors.length >= 4){ 
            setHexErr("Maximum 4 colors."); 
            return;
        }

        onChange([...selectedColors, norm]);
        setHexErr(null);
    }

    const previewColor = normalizeHex(hexInput.trim());
    const previewValid = isValidHex(previewColor);

    return (
        <div className="a4a-color-picker-wrap">
        <div className="a4a-color-add-row">
            <input
            type="color"
            value={wheelColor}
            onChange={handleWheel}
            className="a4a-color-wheel"
            title="Pick a color"
            />

            <div className="a4a-hex-wrap">
            {previewValid && (
                <span className="a4a-hex-preview" style={{ background: previewColor }} />
            )}
            <input
                type="text"
                value={hexInput}
                onChange={handleHexText}
                onKeyDown={(e) => e.key === "Enter" && addColor()}
                placeholder="#16a34a"
                maxLength={7}
                className={`a4a-input${hexErr ? " error" : ""}${previewValid ? " a4a-input--hex-padded" : ""}`}
            />
            </div>

            <button
            type="button"
            className="a4a-add-btn"
            onClick={addColor}
            disabled={selectedColors.length >= 4}
            >
            + Add
            </button>
        </div>

        {hexErr && <p className="a4a-err">⚠ {hexErr}</p>}
        <p className="a4a-color-hint">Use the color wheel or type any hex value. Up to 4 colors.</p>

        {/* Selected color chips */}
        {selectedColors.length > 0 && (
            <div className="a4a-selected-colors">
            {selectedColors.map((c) => (
                <div key={c} className="a4a-color-chip">
                <span className="a4a-color-chip__swatch" style={{ background: c }} />
                <span className="a4a-color-chip__hex">{c}</span>
                <button
                    type="button"
                    className="a4a-color-chip__remove"
                    onClick={() => onChange(selectedColors.filter((x) => x !== c))}
                >X</button>
                </div>
            ))}
            <span className="a4a-color-count">{selectedColors.length}/4</span>
            </div>
        )}
        </div>
    );
}