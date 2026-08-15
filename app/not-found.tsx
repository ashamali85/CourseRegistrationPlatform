import Link from 'next/link';
import { getT } from '@/lib/locale';

export default async function NotFound() {
  const { d } = await getT();

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="card center">
          <h1>{d.notFound.title}</h1>
          <p className="muted mt-2">{d.notFound.body}</p>
          <Link href="/" className="btn btn-primary mt-4">
            {d.notFound.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
