import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 pt-24 text-center">
      <div className="font-mono text-xs text-faint">404</div>
      <h1 className="text-gradient mt-3 text-4xl font-semibold tracking-tight">No signal here.</h1>
      <p className="mt-3 text-muted">This page doesn&apos;t exist.</p>
      <div className="mt-8">
        <Button href="/">Back to overview</Button>
      </div>
    </div>
  );
}
