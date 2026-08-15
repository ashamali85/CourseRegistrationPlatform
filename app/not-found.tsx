import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <div className="container-narrow">
        <div className="card center">
          <h1>Page not found</h1>
          <p className="muted mt-2">That page does not exist or you no longer have access to it.</p>
          <Link href="/" className="btn btn-primary mt-4">
            Go to your dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
