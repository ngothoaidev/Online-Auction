import { ArrowRight } from "lucide-react";

import { useNav } from "../../useNavigate.js";

export default function ViewAllButton({ page }) {
    const nav = useNav();
    return (
        <button
          onClick={() => nav.viewAll(page)}
          className="px-4 py-2 rounded-lg font-medium border-1 border-solid border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--accent)] transition-all flex items-center gap-2 hover:shadow-md"
        >
          View All
          <ArrowRight size={16} />
        </button>
    );
}
