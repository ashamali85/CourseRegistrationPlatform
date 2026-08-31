'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/I18nProvider';

export type GalleryImage = { id: string; url: string; alt: string };

/**
 * Course image slider. One picture at a time, arrows to move through them.
 *
 * The arrows are placed with logical properties and their glyphs mirror in
 * RTL, so "next" always points the way the language reads.
 */
export default function CourseGallery({ images }: { images: GalleryImage[] }) {
  const { d } = useI18n();
  const [index, setIndex] = useState(0);

  const count = images.length;

  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (count === 0) return null;

  return (
    <div className="gallery">
      <div className="gallery-frame">
        {images.map((image, i) => (
          // All images stay mounted and are cross-faded, so moving between
          // them does not show a blank frame while the next one loads.
          <img
            key={image.id}
            src={image.url}
            alt={image.alt}
            className={`gallery-image${i === index ? ' is-active' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
          />
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              className="gallery-nav gallery-prev"
              onClick={() => go(-1)}
              aria-label={d.images.previous}
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-nav gallery-next"
              onClick={() => go(1)}
              aria-label={d.images.next}
            >
              ›
            </button>
            <span className="gallery-counter ltr-text">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="gallery-dots">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={`gallery-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`${d.images.image} ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
