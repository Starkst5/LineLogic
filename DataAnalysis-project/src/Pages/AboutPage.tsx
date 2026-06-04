import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

interface AboutPageProps {
  logicLogo: string;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-[#f5c542]/20 shadow-lg hover:shadow-[#f5c542]/10 transition text-center">
      {title && (
        <h2 className="text-2xl font-semibold mb-4 text-white flex justify-center items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f5c542]" />
          {title}
        </h2>
      )}
      <div className="text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function AboutPage({
  logicLogo,
  onLoginClick,
  onRegisterClick,
}: AboutPageProps) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header
        logicLogo={logicLogo}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />

      <main className="flex-1 px-6 md:px-12 py-12 space-y-10 text-white max-w-5xl mx-auto text-center">

        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-block px-4 py-1 rounded-full border border-[#f5c542]/30 text-[#f5c542] text-sm">
            NBA Analytics Platform
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            About <span className="text-[#f5c542]">NBA Analytics</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Data-driven insights to evaluate player performance, analyze props,
            and make smarter decisions using advanced metrics and trends.
          </p>
        </div>

        {/* Intro */}
        <SectionCard>
          <p>
            NBA Analytics provides <strong>data-driven insights</strong> on player performance.
            By analyzing multiple layers of statistics, trends, and matchup context,
            the app transforms complex data into actionable information.
          </p>

          <p className="mt-4">
            The platform focuses on <strong>performance metrics, trend analysis,
            matchup breakdowns, and Prop Grades</strong> to help users make faster,
            smarter evaluations backed by real data.
          </p>
        </SectionCard>

        {/* How It Works */}
        <SectionCard title="How It Works">
          <ul className="space-y-3">
            <li><strong>Player Lines:</strong> Projected stats across major categories.</li>
            <li><strong>Performance Metrics:</strong> Season + recent trend analysis.</li>
            <li><strong>Matchup Analysis:</strong> Defensive and pace impact evaluation.</li>
            <li><strong>Trend Detection:</strong> Identifies hot and cold streaks.</li>
            <li><strong>Minutes & Usage:</strong> Estimates opportunity and role impact.</li>
          </ul>
        </SectionCard>

        {/* Prop Grade */}
        <SectionCard title="Prop Grade Explained">
          <p>
            The Prop Grade combines multiple factors into a single rating that reflects likelihood at a glance.
          </p>

          <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Season & Recent Performance
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Matchup Difficulty
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Minutes & Usage Rate
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Consistency & Variance
            </div>
          </div>

          <p className="mt-4">
            Grades range from <strong className="text-[#f5c542]">high confidence</strong>
            to <strong className="text-red-400">low confidence</strong>.
          </p>
        </SectionCard>

        {/* Tips */}
        <SectionCard title="Tips for Users">
          <ul className="space-y-3">
            <li>Use Prop Grades as a quick overview, then review deeper stats.</li>
            <li>Compare recent and season averages to detect trends.</li>
            <li>Always consider matchup context and defensive schemes.</li>
            <li>Monitor minutes and rotation changes.</li>
            <li>Avoid overreacting to short streaks.</li>
            <li>Combine multiple metrics for stronger decisions.</li>
          </ul>
        </SectionCard>

        {/* Future Features */}
        <SectionCard title="Future Features">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Expand beyond NBA coverage by adding full analytics for
              <strong> MLB, NFL, WNBA, Soccer, NHL, NCAA Basketball, and NCAA Football</strong>.
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Include <strong>top sportsbook daily prop lines</strong> from major books such as
              FanDuel, DraftKings, BetMGM, Caesars, ESPN BET, and Fanatics Sportsbook.
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-[#f5c542]/10">
              Build a more advanced <strong>AI Prop Grader</strong> trained on historical stats,
              matchup data, injuries, pace, trends, and betting results to create more accurate predictions.
            </div>
          </div>
        </SectionCard>

      </main>

      <Footer logicLogo={logicLogo} />
    </div>
  );
}