import Skeleton from './Skeleton';

/** Placeholder while a page's code chunk loads (keeps the shell, announces politely). */
export default function PageLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-10" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64" />
      <span className="sr-only" role="status">Loading page</span>
    </div>
  );
}
