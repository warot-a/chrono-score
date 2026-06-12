import { ScheduleHero } from '@/components/WorldCup/ScheduleHero';
import { ScheduleView } from '@/components/WorldCup/ScheduleView';

export default function SchedulePage() {
  return (
    <>
      <ScheduleHero />
      <main>
        <div className="wrap">
          <ScheduleView />
        </div>
      </main>
    </>
  );
}
