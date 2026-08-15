export default function FormAlert({
  error,
  message
}: {
  error?: string;
  message?: string;
}) {
  if (error) return <div className="alert alert-error">{error}</div>;
  if (message) return <div className="alert alert-ok">{message}</div>;
  return null;
}
