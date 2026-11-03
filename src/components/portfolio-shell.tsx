import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Menu, ScanLine, Copy, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { assets, email, linkedin, metrics, navigation } from "@/data/content";

export function ResumeButton() {
  return (
    <Button asChild variant="outline" className="mono">
      <a href={assets.resume} download="Mahidhara-S-Resume.pdf">
        RESUME <ArrowDown size={13} />
      </a>
    </Button>
  );
}
export function PortfolioShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [recruiter, setRecruiter] = useState(false);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    setCommand(false);
  }, [location.pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    const open = () => setRecruiter(true);
    window.addEventListener("open-recruiter", open);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("open-recruiter", open);
    };
  }, []);
  return (
    <div className="shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="status-dot" />
          MAHIDHARA S.
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link to="/" activeOptions={{ exact: true }}>
            The Brief
          </Link>
          <Link to="/story">Story</Link>
          <Link to="/work">Work</Link>
          <Link to="/approach">Approach</Link>
          <Link to="/lab">Ask Mahi</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="header-tools">
          <Button
            variant="ghost"
            size="sm"
            className="mono recruiter-button"
            onClick={() => setRecruiter(true)}
          >
            <ScanLine />
            <span className="recruiter-label">RECRUITER</span>
          </Button>
          <ResumeButton />
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu />
          </Button>
        </div>
      </header>
      {children}
      <footer className="footer">
        <p className="mono section-index">THE NEXT PROBLEM IS PROBABLY YOURS.</p>
        <Link to="/contact">
          <h2 className="display">
            BRING ME A MESSY PROBLEM.
            <ArrowUpRight size={42} />
          </h2>
        </Link>
        <div className="footer-bottom">
          <span className="mono">MAHIDHARA S. · BANGALORE · © 2026</span>
          <div className="footer-links mono">
            <a href={`mailto:${email}`}>
              EMAIL <ArrowUpRight size={11} className="inline" />
            </a>
            <a href={linkedin} target="_blank" rel="noreferrer">
              LINKEDIN <ArrowUpRight size={11} className="inline" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="mono h-auto p-0"
              onClick={() => setCommand(true)}
            >
              ⌘ K
            </Button>
          </div>
        </div>
      </footer>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="dialog-panel">
          <DialogTitle className="mono text-primary">EXPLORE THE CONTEXT</DialogTitle>
          <DialogDescription className="sr-only">Portfolio navigation</DialogDescription>
          <nav className="menu-list">
            {navigation.map((n, i) => (
              <Link key={n.to} to={n.to}>
                <span className="mono">0{i + 1}</span>
                {n.name}
              </Link>
            ))}
          </nav>
          <a href={`mailto:${email}`} className="mono text-muted-foreground">
            {email}
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={recruiter} onOpenChange={setRecruiter}>
        <DialogContent className="dialog-panel">
          <DialogTitle className="display text-4xl">THE 30-SECOND BRIEF.</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Machine Learning Engineer · Business Analytics · Strategy & Operations
          </DialogDescription>
          <div className="recruiter-metrics">
            {metrics.map((m) => (
              <div key={m.value}>
                <strong>{m.value}</strong>
                <p>{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            ML Engineer & head of unit at Digital Maven, Bangalore. BE Mechanical Engineering, NIE
            Mysore. PGDM Business Analytics & Marketing, RIMS Bangalore. KPMG Business Analytics L1
            & L2.
          </p>
          <div className="flex gap-3 mt-4">
            <ResumeButton />
            <Button asChild>
              <Link to="/contact" onClick={() => setRecruiter(false)}>
                Let’s talk <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={command} onOpenChange={setCommand}>
        <DialogContent className="dialog-panel">
          <DialogTitle className="mono">JUMP TO</DialogTitle>
          <DialogDescription className="sr-only">Search portfolio pages</DialogDescription>
          <input
            autoFocus
            aria-label="Search pages"
            placeholder="Find a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-card border border-border rounded p-3"
          />
          <nav className="menu-list">
            {navigation
              .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
              .map((n) => (
                <Link key={n.to} to={n.to}>
                  {n.name}
                </Link>
              ))}
          </nav>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(email);
              setCopied(true);
            }}
          >
            <Copy />
            {copied ? "Email copied" : "Copy email"}
          </Button>
          <Button asChild>
            <a href={assets.resume} download>
              <Download />
              Download resume
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
