export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <div className="space-y-4">
          <div className="h-24 w-full animate-pulse rounded-xl bg-neutral-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-neutral-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-neutral-200" />
        </div>
      </main>
    </div>
  );
}
