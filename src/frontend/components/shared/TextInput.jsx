export default function TextInput({ value, onChange, placeholder, type = "text", error, className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`a4a-input${error ? " error" : ""}${className ? " " + className : ""}`}
      autoComplete="off"
    />
  );
}