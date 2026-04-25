export default function Loading() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/30 border-t-white/90 animate-spin" />
        <p className="text-sm text-white/70">Preparing your moment…</p>
      </div>
    </main>
  );
}
