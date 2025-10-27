"use client";
import Link from "next/link";

export type EventCardProps = {
  id: string;
  name: string;
  description?: string;
  photoBase64?: string | null;
  location?: string;
  hotel?: string;
  link?: string;
  onEdit: () => void;
  onDelete: () => void;
};

function IconLocation(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z"/>
      <circle cx="12" cy="11" r="2"/>
    </svg>
  );
}

function IconHotel(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 21V8a3 3 0 013-3h12a3 3 0 013 3v13"/>
      <path d="M6 21v-4h12v4"/>
      <path d="M8 12h8"/>
      <path d="M8 16h8"/>
    </svg>
  );
}

function IconLink(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L9 5"/>
      <path d="M14 11a5 5 0 01-7.07 0L5.5 10A5 5 0 1112.57 2.93L15 5" opacity="0"/>
      <path d="M14 11l-4 4"/>
    </svg>
  );
}

function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 21h6l12-12a2.828 2.828 0 10-4-4L5 17l-2 4z"/>
    </svg>
  );
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}

export default function EventCard({ id, name, description, photoBase64, location, hotel, link, onEdit, onDelete }: EventCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
      {photoBase64 ? (
        <img src={photoBase64} alt={name} className="h-40 w-full object-cover" />
      ) : (
        <div className="h-40 w-full bg-zinc-100" />
      )}
      <div className="p-4 space-y-2">
        <div className="text-lg font-semibold truncate" title={name}>{name}</div>
        {description && (
          <p className="text-sm text-zinc-600 line-clamp-3">{description}</p>
        )}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-700">
          {location && (
            <div className="flex items-center gap-2"><IconLocation className="h-4 w-4" /> {location}</div>
          )}
          {hotel && (
            <div className="flex items-center gap-2"><IconHotel className="h-4 w-4" /> {hotel}</div>
          )}
          {link && (
            <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
              <IconLink className="h-4 w-4" />
              <Link href={link} target="_blank" className="text-blue-600 hover:underline truncate" title={link}>
                {link}
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button onClick={onEdit} className="inline-flex items-center rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 border hover:bg-white">
          <IconEdit className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="inline-flex items-center rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 border hover:bg-white text-red-600">
          <IconTrash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
