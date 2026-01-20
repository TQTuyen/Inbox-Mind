import { Button } from '@fe/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@fe/shared/components/ui/dialog';
import { Input } from '@fe/shared/components/ui/input';
import { Label } from '@fe/shared/components/ui/label';
import {
  addHours,
  format,
  nextMonday,
  setHours,
  setMinutes,
  startOfTomorrow,
} from 'date-fns';
import { Calendar, Clock, Sun, CalendarDays } from 'lucide-react';
import { useState } from 'react';

interface SnoozeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getDate: () => Date;
}

const getSnoozeOptions = (): SnoozeOption[] => {
  const now = new Date();

  return [
    {
      id: 'later-today',
      label: 'Later today',
      description: format(addHours(now, 3), 'h:mm a'),
      icon: <Clock className="h-4 w-4" />,
      getDate: () => addHours(now, 3),
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      description: format(
        setHours(setMinutes(startOfTomorrow(), 0), 9),
        'EEE, MMM d, h:mm a'
      ),
      icon: <Sun className="h-4 w-4" />,
      getDate: () => setHours(setMinutes(startOfTomorrow(), 0), 9),
    },
    {
      id: 'next-week',
      label: 'Next week',
      description: format(
        setHours(setMinutes(nextMonday(now), 0), 9),
        'EEE, MMM d, h:mm a'
      ),
      icon: <CalendarDays className="h-4 w-4" />,
      getDate: () => setHours(setMinutes(nextMonday(now), 0), 9),
    },
  ];
};

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (snoozeUntil: Date) => void;
  emailSubject?: string;
}

// Helper to get current time in HH:mm format
const getCurrentTime = () => format(new Date(), 'HH:mm');

// Helper to get current date in yyyy-MM-dd format
const getCurrentDate = () => format(new Date(), 'yyyy-MM-dd');

export function SnoozeModal({
  isOpen,
  onClose,
  onSnooze,
  emailSubject,
}: SnoozeModalProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(getCurrentDate);
  const [customTime, setCustomTime] = useState(getCurrentTime);

  const snoozeOptions = getSnoozeOptions();

  const handleOptionClick = (option: SnoozeOption) => {
    onSnooze(option.getDate());
    onClose();
  };

  const handleCustomSnooze = () => {
    if (!customDate) return;

    const [hours, minutes] = customTime.split(':').map(Number);
    const date = new Date(customDate);
    date.setHours(hours, minutes, 0, 0);

    if (date > new Date()) {
      onSnooze(date);
      onClose();
      setShowCustom(false);
      setCustomDate(getCurrentDate());
      setCustomTime(getCurrentTime());
    }
  };

  const handleClose = () => {
    setShowCustom(false);
    setCustomDate(getCurrentDate());
    setCustomTime(getCurrentTime());
    onClose();
  };

  // Get minimum date (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Snooze email
          </DialogTitle>
          {emailSubject && (
            <DialogDescription className="truncate">
              {emailSubject}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {/* Quick options */}
          {snoozeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="text-gray-500 dark:text-gray-400 shrink-0">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {option.description}
                </div>
              </div>
            </button>
          ))}

          {/* Custom option */}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="text-gray-500 dark:text-gray-400 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  Pick date & time
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a custom date and time
                </div>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="snooze-date"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Date
                </Label>
                <Input
                  id="snooze-date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={minDate}
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="snooze-time"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Time
                </Label>
                <Input
                  id="snooze-time"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustom(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomSnooze}
                  disabled={!customDate}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Snooze
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
