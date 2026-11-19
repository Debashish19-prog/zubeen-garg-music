import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <div className="weave mx-auto mb-6 h-3 w-24 rounded" />
        <h1 className="text-3xl font-black tracking-tight">Page not found</h1>
        <p className="mt-2 text-sub">We can’t seem to find the page you are looking for.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-8 font-bold text-black transition-transform hover:scale-105">
          Home
        </Link>
      </div>
    </div>
  );
}
