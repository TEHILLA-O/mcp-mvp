import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <h1 className="font-serif text-4xl">That page is not in the gazette.</h1>
      <Link href="/" className="underline">
        Return to the overview
      </Link>
    </div>
  );
}
