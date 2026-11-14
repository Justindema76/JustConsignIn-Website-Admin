import { branchOf } from './branch';
import './branch.css';

// "Hamilton & Niagara · Credit: Justin" on leads from Justin's branch; "H&N area" on main-site
// leads in a branch town. Shown to the owner only.
export function BranchChip({ row }) {
  const kind = branchOf(row);
  if (kind === 'credit') return <span className="job-chip branch-credit" title="Came through the Hamilton & Niagara section of the site">Hamilton &amp; Niagara · Credit: Justin</span>;
  if (kind === 'area') return <span className="job-chip branch-area" title="Main-site lead in a Hamilton or Niagara town. Not counted as your branch.">H&amp;N area</span>;
  return null;
}
