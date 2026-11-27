export default function Notice({ children, error = false }) {
  if (!children) return null;
  return <p className={`mensaje ${error ? 'mensaje-error' : 'mensaje-ok'}`} role="status">{children}</p>;
}
