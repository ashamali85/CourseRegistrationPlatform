import Link from 'next/link';
import { getT } from '@/lib/locale';
import { consumeVerificationToken } from '@/lib/email/verification';

export const dynamic = 'force-dynamic';

/**
 * The target of the emailed link. Email clients issue a GET, so the token is
 * consumed here; it is single-use and expiring, which is what keeps that safe.
 */
export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { d } = await getT();
  const { token } = await searchParams;

  const result = token ? await consumeVerificationToken(token) : 'invalid';

  const copy = {
    verified: { title: d.verify.successTitle, body: d.verify.successBody, ok: true },
    already: { title: d.verify.alreadyTitle, body: d.verify.alreadyBody, ok: true },
    expired: { title: d.verify.expiredTitle, body: d.verify.expiredBody, ok: false },
    invalid: { title: d.verify.invalidTitle, body: d.verify.invalidBody, ok: false }
  }[result];

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="card card-pad-lg center mt-6">
          <span className={`pill ${copy.ok ? 'pill-ok' : 'pill-danger'}`}>
            {copy.ok ? d.verify.badgeOk : d.verify.badgeFailed}
          </span>
          <h1 className="mt-4">{copy.title}</h1>
          <p className="muted mt-2">{copy.body}</p>
          <Link href="/courses" className="btn btn-primary mt-6">
            {copy.ok ? d.verify.continueCta : d.verify.signInCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
