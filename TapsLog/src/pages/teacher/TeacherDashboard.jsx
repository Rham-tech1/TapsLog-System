import { AttendanceStream } from '../desktop/AttendanceStream';
import { SessionController } from '../desktop/SessionController';
import { SchedulePanel } from '../desktop/SchedulePanel';

export function TeacherDashboard() {
  return (
    <div className="grid grid-cols-12 h-full overflow-hidden">
      <div className="col-span-12 lg:col-span-5 border-r border-slate-200/80 overflow-y-auto">
        <AttendanceStream />
      </div>
      <div className="col-span-12 lg:col-span-3 border-r border-slate-200/80 overflow-y-auto">
        <SessionController />
      </div>
      <div className="col-span-12 lg:col-span-4 overflow-y-auto">
        <SchedulePanel />
      </div>
    </div>
  );
}

export default TeacherDashboard;
